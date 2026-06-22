/**
 * 공연장 수정 기능 (PUT)
 */
async function updateVenue(e) {
    e.preventDefault();

    const form = document.querySelector("#venue-edit-form");
    const venueId = form.getAttribute("data-id");

    const reqDTO = {
        name: document.querySelector("#name").value,
        totalCapacity: document.querySelector("#totalCapacity").value,
        address: document.querySelector("#address").value,
        seatMapFilePath: document.querySelector("#seatMapFilePath").value
    };

    CcUI.loading.show();

    try {
        const { res, data } = await apiPut(`/api/venues/${venueId}`, reqDTO);

        if (res && res.ok) {
            CcUI.toast("공연장이 성공적으로 수정되었습니다.");
            setTimeout(() => {
                location.href = "/admin/venues";
            }, 1000);
        } else {
            CcUI.alert((data && data.msg) ? data.msg : "수정에 실패했습니다.");
        }
    } catch (error) {
        console.error("Update Venue Error:", error);
        CcUI.alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
        CcUI.loading.hide();
    }
}

/**
 * 공연장 삭제 기능 (DELETE)
 */
async function deleteVenue(venueId) {
    CcUI.confirm({
        title: "공연장 삭제",
        text: "정말로 이 공연장을 삭제하시겠습니까?",
        confirmText: "삭제",
        danger: true,
        onConfirm: async function () {
            CcUI.loading.show();
            try {
                const { res, data } = await apiDelete(`/api/venues/${venueId}`);

                if (res && res.ok) {
                    CcUI.toast("삭제되었습니다.");
                    setTimeout(() => location.reload(), 1000);
                } else {
                    CcUI.alert((data && data.msg) ? data.msg : "삭제에 실패했습니다.");
                }
            } catch (error) {
                console.error("Delete Venue Error:", error);
                CcUI.alert("서버 통신 중 오류가 발생했습니다.");
            } finally {
                CcUI.loading.hide();
            }
        }
    });
}

// 화면 로드 시 이벤트 연결
document.addEventListener("DOMContentLoaded", () => {
    const venueEditForm = document.querySelector("#venue-edit-form");
    if (venueEditForm) {
        venueEditForm.addEventListener("submit", updateVenue);
    }

    const deleteButtons = document.querySelectorAll(".btn-delete-venue");
    deleteButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const venueId = e.target.getAttribute("data-id");
            if (venueId) deleteVenue(venueId);
        });
    });
});