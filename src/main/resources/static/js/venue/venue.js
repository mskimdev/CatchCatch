document.addEventListener("DOMContentLoaded", function () {
    const deleteButtons = document.querySelectorAll(".btn-delete");
    const editForm = document.getElementById("venue-edit-form");

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

                        const { res, data } = await apiDelete(`/api/admin/venues/${id}`);

                        if (!res || !res.ok) {
                            CcUI.alert(
                                data?.msg ?? "등록된 콘서트가 있는 공연장은 삭제할 수 없습니다.",
                                "error"
                            );
                            return;
                        }

                        CcUI.toast(data?.body ?? data?.msg ?? "삭제되었습니다.");
                        location.reload();

                    } catch (e) {
                        console.error(e);
                        CcUI.alert("삭제 처리 중 오류가 발생했습니다.", "error");
                    } finally {
                        CcUI.loading.hide();
                    }
                }
            });
        });
    });

    if (editForm) {
        editForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const id = editForm.dataset.id;

            const name = editForm.querySelector('[name="name"]').value.trim();
            const address = editForm.querySelector('[name="address"]').value.trim();
            const totalCapacity = editForm.querySelector('[name="totalCapacity"]').value;
            const seatMapFilePath = editForm.querySelector('[name="seatMapFilePath"]').value;

            if (name === "") {
                CcUI.alert("공연장명을 입력해주세요.", "warning");
                return;
            }

            if (address === "") {
                CcUI.alert("주소를 입력해주세요.", "warning");
                return;
            }

            const capacity = Number(totalCapacity);

            if (totalCapacity === "" || Number.isNaN(capacity) || capacity < 1) {
                CcUI.alert("총 수용 인원은 1명 이상 숫자로 입력해주세요.", "warning");
                return;
            }

            if (!Number.isInteger(capacity)) {
                CcUI.alert("총 수용 인원은 정수로 입력해주세요.", "warning");
                return;
            }

            if (seatMapFilePath === "") {
                CcUI.alert("좌석배치도 파일을 선택해주세요.", "warning");
                return;
            }

            const body = {
                name: name,
                address: address,
                totalCapacity: capacity,
                seatMapFilePath: seatMapFilePath
            };

            CcUI.confirm({
                title: "공연장 정보를 수정하시겠습니까?",
                text: "수정한 공연장 정보는 콘서트 등록 시 공연장 선택 목록에 반영됩니다.",
                confirmText: "수정",
                cancelText: "취소",
                danger: false,
                onConfirm: async () => {
                    try {
                        CcUI.loading.show("수정 중입니다...");

                        const { res, data } = await apiPut(`/api/admin/venues/${id}`, body);

                        if (!res || !res.ok) {
                            CcUI.alert(data?.msg ?? "공연장 수정에 실패했습니다.", "error");
                            return;
                        }

                        CcUI.toast(data?.body ?? data?.msg ?? "수정되었습니다.");

                        setTimeout(function () {
                            location.href = "/admin/venues";
                        }, 500);

                    } catch (e) {
                        console.error(e);
                        CcUI.alert("수정 처리 중 오류가 발생했습니다.", "error");
                    } finally {
                        CcUI.loading.hide();
                    }
                }
            });
        });
    }
});