(() => {
    "use strict";

    const URLS = {
        projectCreate: "/admin/seatmap/project-create",
        projectList: "/admin/seatmap/project-list",
        projectDelete: "/admin/seatmap/project-delete",
        tempSave: "/admin/seatmap/temp-save",
        cropRotate: "/admin/seatmap/crop-rotate",
        buttonImage: "/admin/seatmap/button-image"
    };

    const PROJECTS_KEY = "seatmap_projects";
    const CURRENT_PROJECT_KEY = "seatmap_current_project_id";

    const DUMMY_SEATS = [{ id: "1-A-1-1-VIP-AVAILABLE" }];
    const DUMMY_SECTIONS = [{ id: "1-A", name: "A구역", grade: "VIP", seatCount: 0 }];

    const STORAGE_KEYS = {
        seatButtonImage: [
            "seat_button_originalImage",
            "seat_button_resultImage",
            "seat_button_imageMeta",
            "seat_button_groups",
            "seat_button_entryFromMain"
        ],
        concert: [
            "concert_originalImage",
            "concert_cleanImage",
            "concert_buttonImage",
            "concert_buttonImageMeta",
            "concert_sections",
            "concert_seats",
            "concert_extractSettings",
            "concert_finalLayout",
            "concert_imageMeta",
            "concert_entryFromMain",
            "concert_stage1_colorRegions",
            "concert_stage1_angleRegions",
            "concert_stage1_selectedAngleRegions",
            "concert_stage1_sections",
            "concert_stage1_seats",
            "concert_stage1_layouts",
            "concert_stage1_generatedImage",
            "concert_stage1_baseLayoutsByGroup",
            "concert_stage1_visualGroups",
            "concert_stage1_selectedVisualGroupId",
            "concert_stage2_sections",
            "concert_stage2_selectedSections",
            "concert_stage2_layouts",
            "concert_stage3_seats",
            "concert_stage3_layouts",
            "concert_stage3_selectedSection",
            "concert_stage4_sections",
            "concert_stage4_finalImage",
            "concert_stage4_result"
        ]
    };

    const $ = (id) => document.getElementById(id);

    document.addEventListener("DOMContentLoaded", () => {
        bindButtons();
        bindFileInput();
        renderCurrentProject();
        renderProjectList();
        loadServerProjects();
    });

    function bindButtons() {
        bindClick("createSeatmapProject", openNewImagePicker);
        bindClick("saveCurrentSeatmap", saveCurrentProject);
        bindClick("saveCurrentSeatmapInline", saveCurrentProject);
        bindClick("reloadProjectList", async () => {
            await loadServerProjects();
            renderProjectList();
            toast("도면 목록을 새로고침했습니다.");
        });
        document.querySelectorAll("[data-open-url]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                openStage(button.dataset.openUrl);
            });
        });

        document.querySelectorAll("[data-action='button-image']").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                startButtonImageWork();
            });
        });

        document.querySelectorAll("[data-card-url]").forEach((card) => {
            card.addEventListener("dblclick", () => openStage(card.dataset.cardUrl));
        });

        document.querySelectorAll("[data-card-action='button-image']").forEach((card) => {
            card.addEventListener("dblclick", startButtonImageWork);
        });
    }

    function bindClick(id, handler) {
        const element = $(id);

        if (!element) {
            return;
        }

        element.addEventListener("click", (event) => {
            event.preventDefault();
            handler(event);
        });
    }

    function bindFileInput() {
        const input = $("newSeatmapImageFileInput");

        if (!input) {
            return;
        }

        input.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            input.value = "";

            if (!file) {
                return;
            }

            if (!isPngFile(file)) {
                toast("PNG 파일만 불러올 수 있습니다.");
                return;
            }

            const imageDataUrl = await readImageAsync(file);
            await createNewProjectFromImage(file, imageDataUrl);
        });
    }

    function openNewImagePicker() {
        const input = $("newSeatmapImageFileInput");

        if (!input) {
            toast("이미지 입력 요소를 찾을 수 없습니다.");
            return;
        }

        input.click();
    }

    async function createNewProjectFromImage(file, imageDataUrl) {
        const now = new Date();
        const defaultName = removeExtension(file.name) || "콘서트 대형장 도면";
        const inputName = window.prompt("도면 이름을 입력하세요.", defaultName);

        if (inputName === null) {
            toast("도면 생성을 취소했습니다.");
            return;
        }

        const projectName = String(inputName || defaultName).trim() || defaultName;
        const folderName = createFolderName(projectName, now);

        clearWork("seatButtonImage");
        clearWork("concert");

        let project = buildLocalProject({
            id: folderName,
            name: projectName,
            folderName,
            sourceFileName: file.name,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            imageDataUrl
        });

        try {
            const response = await fetch(URLS.projectCreate, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    projectName,
                    folderName,
                    sourceFileName: file.name,
                    imageDataUrl
                })
            });

            if (!response.ok) {
                throw new Error(await response.text() || `project-create failed: ${response.status}`);
            }

            const result = await response.json();

            project = buildLocalProject({
                id: result.folderName || folderName,
                name: result.projectName || projectName,
                folderName: result.folderName || folderName,
                sourceFileName: file.name,
                createdAt: result.createdAt || now.toISOString(),
                updatedAt: result.updatedAt || now.toISOString(),
                imageDataUrl,
                files: {
                    folder: result.folderUrl,
                    originalImage: result.originalImageUrl,
                    croppedImage: result.croppedImageUrl,
                    image: result.imageUrl,
                    seatJson: result.seatJsonUrl,
                    sectionJson: result.sectionJsonUrl,
                    metaJson: result.metaJsonUrl
                }
            });
        } catch (error) {
            console.error(error);
            toast("서버 폴더 생성은 실패했습니다. 브라우저 작업 데이터로 계속합니다.");
        }

        applyProjectToLocalStorage(project);
        saveProject(project);
        setCurrentProjectId(project.id);
        renderProjectList();
        renderCurrentProject();

        toast(`${project.name} 도면을 생성했습니다.`);
        window.setTimeout(() => {
            location.href = `${URLS.cropRotate}?projectId=${encodeURIComponent(project.folderName)}`;
        }, 350);
    }

    function buildLocalProject(source) {
        const folderName = source.folderName || source.id;
        const createdAt = source.createdAt || new Date().toISOString();
        const updatedAt = source.updatedAt || createdAt;

        return {
            id: source.id || folderName,
            name: source.name || source.projectName || folderName,
            type: "CONCERT",
            status: source.status || "CREATED",
            folderName,
            sourceFileName: source.sourceFileName || "",
            createdAt,
            updatedAt,
            seatJsonText: JSON.stringify(DUMMY_SEATS),
            sectionJsonText: JSON.stringify(DUMMY_SECTIONS),
            imageDataUrl: source.imageDataUrl || null,
            files: source.files || createLocalFileMap(folderName)
        };
    }

    async function saveCurrentProject() {
        const project = getCurrentProject();

        if (!project) {
            toast("저장할 도면이 없습니다.");
            return;
        }

        const seatJsonText = getCompactSeatJson();
        const sectionJsonText = getCompactSectionJson();
        const imageDataUrl = getCurrentImageDataUrl();

        try {
            const result = await postTempSave(project, seatJsonText, sectionJsonText, imageDataUrl);
            if (result && result.success) {
                project.files = {
                    ...project.files,
                    folder: result.folderUrl || project.files?.folder,
                    image: result.imageUrl || project.files?.image,
                    croppedImage: result.croppedImageUrl || project.files?.croppedImage,
                    seatJson: result.seatJsonUrl || project.files?.seatJson,
                    sectionJson: result.sectionJsonUrl || project.files?.sectionJson
                };
            }
        } catch (error) {
            console.error(error);
            toast("서버 저장 실패");
            return;
        }

        project.seatJsonText = seatJsonText;
        project.sectionJsonText = sectionJsonText;
        project.imageDataUrl = imageDataUrl || project.imageDataUrl || null;
        project.updatedAt = new Date().toISOString();
        project.status = "SAVED";
        saveProject(project);

        renderProjectList();
        renderCurrentProject();
        toast("현재 도면을 저장했습니다.");
    }

    async function postTempSave(project, seatJsonText, sectionJsonText, imageDataUrl) {
        const response = await fetch(URLS.tempSave, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                page: "seatmap-main",
                folderName: project.folderName,
                seatJsonText,
                sectionJsonText,
                imageDataUrl
            })
        });

        if (!response.ok) {
            throw new Error(await response.text() || `temp-save failed: ${response.status}`);
        }

        return response.json();
    }

    function openStage(url) {
        const project = getCurrentProject();

        if (!project) {
            toast("새 도면 생성을 먼저 진행하세요.");
            return;
        }

        applyProjectToLocalStorage(project);
        localStorage.setItem("concert_entryFromMain", "true");

        const separator = url.includes("?") ? "&" : "?";
        location.href = `${url}${separator}projectId=${encodeURIComponent(project.folderName)}`;
    }

    function startButtonImageWork() {
        const project = getCurrentProject();

        if (!project) {
            toast("새 도면 생성을 먼저 진행하세요.");
            return;
        }

        applyProjectToLocalStorage(project);

        if (!localStorage.getItem("seat_button_originalImage")) {
            toast("원본 PNG를 찾을 수 없습니다.");
            return;
        }

        localStorage.setItem("seat_button_entryFromMain", "true");
        location.href = `${URLS.buttonImage}?projectId=${encodeURIComponent(project.folderName)}`;
    }

    function applyProjectToLocalStorage(project) {
        const seatText = project.seatJsonText || JSON.stringify(DUMMY_SEATS);
        const sectionText = project.sectionJsonText || JSON.stringify(DUMMY_SECTIONS);
        const imageUrl = project.imageDataUrl
            || localStorage.getItem("seatmap_cropped_image")
            || localStorage.getItem("seat_button_originalImage")
            || null;

        localStorage.setItem("concert_seats", seatText);
        localStorage.setItem("concert_stage3_seats", seatText);
        localStorage.setItem("concert_sections", sectionText);
        localStorage.setItem("concert_stage4_sections", sectionText);
        localStorage.setItem("seatmap_current_folder_name", project.folderName);

        if (imageUrl) {
            localStorage.setItem("seat_button_originalImage", imageUrl);
            localStorage.setItem("concert_originalImage", imageUrl);
            localStorage.setItem("seatmap_crop_originalImage", imageUrl);
        }

        localStorage.setItem("seat_button_entryFromMain", "true");
        localStorage.setItem("concert_entryFromMain", "true");
        localStorage.setItem("concert_imageMeta", JSON.stringify({
            source: "seatmap-main",
            projectId: project.id,
            folderName: project.folderName,
            updatedAt: new Date().toISOString()
        }));
    }

    function clearWork(type) {
        const keys = STORAGE_KEYS[type] || [];
        keys.forEach((key) => localStorage.removeItem(key));
    }

    function getCompactSeatJson() {
        const stored = localStorage.getItem("concert_stage3_seats") || localStorage.getItem("concert_seats");
        return compactJson(stored, DUMMY_SEATS);
    }

    function getCompactSectionJson() {
        const stored = localStorage.getItem("concert_stage4_sections") || localStorage.getItem("concert_sections");
        return compactJson(stored, DUMMY_SECTIONS);
    }

    function compactJson(stored, fallback) {
        try {
            const value = stored ? JSON.parse(stored) : fallback;
            return JSON.stringify(value);
        } catch (error) {
            return JSON.stringify(fallback);
        }
    }

    function getCurrentImageDataUrl() {
        return localStorage.getItem("concert_stage4_finalImage")
            || localStorage.getItem("concert_buttonImage")
            || localStorage.getItem("seat_button_resultImage")
            || localStorage.getItem("seatmap_cropped_image")
            || localStorage.getItem("seat_button_originalImage")
            || localStorage.getItem("concert_originalImage")
            || null;
    }

    function saveProject(project) {
        const projects = getProjects().filter((item) => item.id !== project.id && item.folderName !== project.folderName);
        projects.unshift(project);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 80)));
    }

    function getProjects() {
        try {
            return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
        } catch (error) {
            return [];
        }
    }

    function getCurrentProject() {
        const id = localStorage.getItem(CURRENT_PROJECT_KEY);

        if (!id) {
            return null;
        }

        return getProjects().find((project) => project.id === id || project.folderName === id) || null;
    }

    function setCurrentProjectId(id) {
        localStorage.setItem(CURRENT_PROJECT_KEY, id);
    }

    async function loadServerProjects() {
        try {
            const response = await fetch(URLS.projectList, { credentials: "same-origin" });

            if (!response.ok) {
                return;
            }

            const result = await response.json();
            const serverProjects = Array.isArray(result.projects) ? result.projects : [];

            if (serverProjects.length === 0) {
                return;
            }

            const localProjects = getProjects();
            const merged = [...localProjects];

            serverProjects.forEach((item) => {
                const folderName = item.folderName || item.id;
                if (!folderName) {
                    return;
                }

                const exists = merged.some((project) => project.folderName === folderName || project.id === folderName);
                if (!exists) {
                    merged.push(buildLocalProject({
                        id: folderName,
                        name: item.projectName || item.name || folderName,
                        folderName,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                        status: "SAVED",
                        files: {
                            folder: item.folderUrl,
                            originalImage: item.originalImageUrl,
                            croppedImage: item.croppedImageUrl,
                            image: item.imageUrl,
                            seatJson: item.seatJsonUrl,
                            sectionJson: item.sectionJsonUrl,
                            metaJson: item.metaJsonUrl
                        }
                    }));
                }
            });

            localStorage.setItem(PROJECTS_KEY, JSON.stringify(merged.slice(0, 80)));
            renderProjectList();
        } catch (error) {
            console.debug("project-list skipped", error);
        }
    }

    function renderProjectList() {
        const list = $("projectList");

        if (!list) {
            return;
        }

        const projects = getProjects();
        const currentId = localStorage.getItem(CURRENT_PROJECT_KEY);

        if (projects.length === 0) {
            list.innerHTML = '<div class="empty-project">저장된 도면이 없습니다.</div>';
            return;
        }

        list.innerHTML = projects.map((project) => {
            const activeClass = project.id === currentId || project.folderName === currentId ? " project-item--active" : "";
            const detailText = createProjectDetailText(project);

            return `
                <div class="project-item${activeClass}" title="${escapeHtml(detailText)}" data-project-id="${escapeHtml(project.id)}">
                    <div class="project-item__name">${escapeHtml(project.name)}</div>
                    <div class="project-item__actions">
                        <button type="button" class="project-action project-action--load" data-project-load="${escapeHtml(project.id)}">불러오기</button>
                        <button type="button" class="project-action project-action--delete" data-project-delete="${escapeHtml(project.id)}">삭제</button>
                    </div>
                </div>
            `;
        }).join("");

        list.querySelectorAll("[data-project-load]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                loadProject(button.dataset.projectLoad);
            });
        });

        list.querySelectorAll("[data-project-delete]").forEach((button) => {
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await deleteProject(button.dataset.projectDelete);
            });
        });
    }

    function loadProject(projectId) {
        const project = getProjects().find((item) => item.id === projectId || item.folderName === projectId);

        if (!project) {
            toast("도면 정보를 찾을 수 없습니다.");
            return;
        }

        setCurrentProjectId(project.id);
        applyProjectToLocalStorage(project);
        renderCurrentProject();
        renderProjectList();
        toast("도면을 불러왔습니다.");
    }

    async function deleteProject(projectId) {
        const project = getProjects().find((item) => item.id === projectId || item.folderName === projectId);

        if (!project) {
            toast("도면 정보를 찾을 수 없습니다.");
            return;
        }

        if (!window.confirm(`정말로 '${project.name}' 도면을 삭제할까요?`)) {
            return;
        }

        try {
            const response = await fetch(URLS.projectDelete, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ folderName: project.folderName || project.id })
            });

            if (!response.ok) {
                throw new Error(await response.text() || `project-delete failed: ${response.status}`);
            }
        } catch (error) {
            console.error(error);
            toast("서버 도면 삭제 실패");
            return;
        }

        const projects = getProjects().filter((item) => item.id !== project.id && item.folderName !== project.folderName);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

        const currentId = localStorage.getItem(CURRENT_PROJECT_KEY);
        if (currentId === project.id || currentId === project.folderName) {
            localStorage.removeItem(CURRENT_PROJECT_KEY);
        }

        renderCurrentProject();
        renderProjectList();
        toast("도면을 삭제했습니다.");
    }

    function createProjectDetailText(project) {
        return [
            `도면명: ${project.name || ""}`,
            `상태: ${project.status || ""}`,
            `생성일: ${formatDate(project.createdAt)}`,
            `저장일: ${formatDate(project.updatedAt)}`,
            `경로: /temp/seatmap/${project.folderName || project.id || ""}`
        ].join("\n");
    }

    function renderCurrentProject() {
        const project = getCurrentProject();
        const name = $("currentProjectName");
        const meta = $("currentProjectMeta");

        if (!name || !meta) {
            return;
        }

        if (!project) {
            name.textContent = "도면 없음";
            meta.textContent = "새 도면 생성을 눌러 PNG 파일을 불러오세요.";
            return;
        }

        name.textContent = project.name;
        meta.textContent = `${project.type} · ${project.status} · ${formatDate(project.updatedAt)} · /temp/seatmap/${project.folderName}`;
    }

    function readImageAsync(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function isPngFile(file) {
        const name = String(file.name || "").toLowerCase();
        return file.type === "image/png" || name.endsWith(".png");
    }

    function removeExtension(fileName) {
        return String(fileName || "").replace(/\.[^/.]+$/, "").trim();
    }

    function createFolderName(projectName, date) {
        const base = String(projectName || "")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");

        return base || `seatmap-${date.getTime()}`;
    }

    function createLocalFileMap(folderName) {
        const base = `/temp/seatmap/${folderName}`;

        return {
            folder: base,
            originalImage: `${base}/original-image.png`,
            croppedImage: `${base}/cropped-image.png`,
            image: `${base}/seatmap-image.png`,
            seatJson: `${base}/seatmap-seats.json`,
            sectionJson: `${base}/seatmap-sections.json`,
            metaJson: `${base}/seatmap-meta.json`
        };
    }

    function formatDate(value) {
        if (!value) {
            return "날짜 없음";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "날짜 없음";
        }

        return date.toLocaleString("ko-KR", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function toast(message) {
        const element = $("toast");

        if (!element) {
            alert(message);
            return;
        }

        element.textContent = message;
        element.classList.add("toast--show");

        window.clearTimeout(toast.timer);
        toast.timer = window.setTimeout(() => {
            element.classList.remove("toast--show");
        }, 2200);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
})();
