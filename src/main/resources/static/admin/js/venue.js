document.addEventListener("DOMContentLoaded", function () {
    const editButtons = document.querySelectorAll(".btn-edit");
    const deleteButtons = document.querySelectorAll(".btn-delete");

    editButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const id = button.dataset.id;

            location.href = `/admin/venues/${id}/edit`;
        });
    });

    deleteButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const id = button.dataset.id;

            if (!confirm("이 공연장을 삭제하시겠습니까?")) {
                return;
            }

            fetch(`/admin/venues/${id}/delete`, {
                method: "POST"
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("삭제 실패");
                    }

                    alert("삭제되었습니다.");
                    location.reload();
                })
                .catch(function (error) {
                    console.error(error);
                    alert("삭제 중 오류가 발생했습니다.");
                });
        });
    });
});

editButtons.forEach(function (button) {
    button.addEventListener("click", function () {
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

        fetch(`/admin/venues/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                address: address,
                totalCapacity: Number(totalCapacity)
            })
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("수정 실패");
                }

                alert("수정되었습니다.");
                location.reload();
            })
            .catch(function (error) {
                console.error(error);
                alert("수정 중 오류가 발생했습니다.");
            });
    });
});