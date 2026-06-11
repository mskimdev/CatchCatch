import { apiPut, apiDelete } from "/js/core/api.js";

document.addEventListener("DOMContentLoaded", function () {
    console.log("venue.js 실행됨");

    const editButtons = document.querySelectorAll(".btn-edit");
    const deleteButtons = document.querySelectorAll(".btn-delete");

    console.log("수정 버튼 개수:", editButtons.length);
    console.log("삭제 버튼 개수:", deleteButtons.length);

    editButtons.forEach(function (button) {
        button.addEventListener("click", async function () {
            console.log("수정 버튼 클릭됨");

            const id = button.dataset.id;
            const oldName = button.dataset.name;
            const oldAddress = button.dataset.address;
            const oldCapacity = button.dataset.capacity;

            const name = prompt("공연장명을 수정하세요.", oldName);
            if (name === null) return;

            const address = prompt("주소를 수정하세요.", oldAddress);
            if (address === null) return;

            const totalCapacity = prompt("총 수용 인원을 수정하세요.", oldCapacity);
            if (totalCapacity === null) return;

            if (name.trim() === "") {
                CcUI.alert("공연장명을 입력해주세요.", "warning");
                return;
            }

            if (address.trim() === "") {
                CcUI.alert("주소를 입력해주세요.", "warning");
                return;
            }

            if (Number.isNaN(Number(totalCapacity)) || Number(totalCapacity) < 1) {
                CcUI.alert("총 수용 인원은 1명 이상 숫자로 입력해주세요.", "warning");
                return;
            }

            const body = {
                name: name.trim(),
                address: address.trim(),
                totalCapacity: Number(totalCapacity)
            };

            try {
                CcUI.loading.show("수정 중입니다...");

                const { res, data } = await apiPut(`/api/venues/${id}`, body);

                CcUI.loading.hide();

                if (!res || !res.ok) {
                    CcUI.alert(data?.msg ?? "수정에 실패했습니다.", "error");
                    return;
                }

                CcUI.toast(data?.msg ?? "수정되었습니다.");
                location.reload();

            } catch (e) {
                CcUI.loading.hide();
                CcUI.alert("수정 처리 중 오류가 발생했습니다.", "error");
            }
        });
    });

    deleteButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const id = button.dataset.id;

            CcUI.confirm({
                title: "이 공연장을 삭제하시겠습니까?",
                text: "등록된 콘서트가 있는 공연장은 삭제할 수 없습니다.",
                confirmText: "삭제",
                cancelText: "취소",
                danger: true,
                onConfirm: async () => {
                    try {
                        CcUI.loading.show("삭제 중입니다...");

                        const { res, data } = await apiDelete(`/api/venues/${id}`);

                        CcUI.loading.hide();

                        if (!res || !res.ok) {
                            CcUI.alert(
                                data?.msg ?? "등록된 공연이 있는 공연장은 삭제할 수 없습니다.",
                                "error"
                            );
                            return;
                        }

                        CcUI.toast(data?.msg ?? "삭제되었습니다.");
                        location.reload();

                    } catch (e) {
                        CcUI.loading.hide();
                        CcUI.alert("삭제 처리 중 오류가 발생했습니다.", "error");
                    }
                }
            });
        });
    });
});