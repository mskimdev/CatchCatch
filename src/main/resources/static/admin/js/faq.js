document.addEventListener("DOMContentLoaded", function () {
    console.log("faq.js 실행됨");

    const deleteSuccessMessage = sessionStorage.getItem("faqDeleteSuccess");
    if (deleteSuccessMessage) {
        sessionStorage.removeItem("faqDeleteSuccess");
        CcUI.toast(deleteSuccessMessage);
    }

    // FAQ 목록 삭제 버튼
    const deleteButtons = document.querySelectorAll(".btn-delete");

    // FAQ 수정 폼
    const editForm = document.getElementById("faq-edit-form");

    console.log("FAQ 삭제 버튼 개수:", deleteButtons.length);
    console.log("FAQ 수정 폼 존재 여부:", editForm !== null);

    // =========================
    // FAQ 삭제 처리
    // =========================
    deleteButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const id = button.dataset.id;

            CcUI.confirm({
                title: "FAQ를 삭제하시겠습니까?",
                text: "삭제된 FAQ는 복구할 수 없습니다.",
                confirmText: "삭제",
                cancelText: "취소",
                danger: true,
                onConfirm: async () => {
                    try {
                        CcUI.loading.show("삭제 중입니다...");

                        const { res, data } = await apiDelete(`/api/faqs/${id}`);

                        CcUI.loading.hide();

                        if (!res || !res.ok) {
                            CcUI.alert(data?.msg ?? "FAQ 삭제에 실패했습니다.", "error");
                            return;
                        }

                        sessionStorage.setItem(
                            "faqDeleteSuccess",
                            data?.body ?? data?.msg ?? "FAQ가 삭제되었습니다."
                        );
                        location.reload();

                    } catch (e) {
                        CcUI.loading.hide();
                        console.error(e);
                        CcUI.alert("삭제 처리 중 오류가 발생했습니다.", "error");
                    }
                }
            });
        });
    });

   // =========================
   // FAQ 수정 처리
   // =========================
   if (editForm) {
       editForm.addEventListener("submit", function (e) {
           e.preventDefault();

           const id = editForm.dataset.id;

           const category = editForm.querySelector('[name="category"]').value;
           const question = editForm.querySelector('[name="question"]').value.trim();
           const answer = editForm.querySelector('[name="answer"]').value.trim();

           if (!category) {
               CcUI.alert("카테고리를 선택해주세요.", "warning");
               return;
           }

           if (question === "") {
               CcUI.alert("질문을 입력해주세요.", "warning");
               return;
           }

           if (question.length > 200) {
               CcUI.alert("질문은 200자 이하로 입력해주세요.", "warning");
               return;
           }

           if (answer === "") {
               CcUI.alert("답변을 입력해주세요.", "warning");
               return;
           }

           const body = {
               category: category,
               question: question,
               answer: answer
           };

           CcUI.confirm({
               title: "FAQ를 수정하시겠습니까?",
               text: "수정한 내용은 사용자 FAQ 화면에 바로 반영됩니다.",
               confirmText: "수정",
               cancelText: "취소",
               danger: false,
               onConfirm: async () => {
                   try {
                       CcUI.loading.show("수정 중입니다...");

                       const { res, data } = await apiPut(`/api/faqs/${id}`, body);

                       CcUI.loading.hide();

                       if (!res || !res.ok) {
                           CcUI.alert(data?.msg ?? "FAQ 수정에 실패했습니다.", "error");
                           return;
                       }

                       CcUI.toast(data?.body ?? data?.msg ?? "수정되었습니다.");

                       setTimeout(function () {
                           location.href = "/admin/boards/faq";
                       }, 500);

                   } catch (e) {
                       CcUI.loading.hide();
                       console.error(e);
                       CcUI.alert("수정 처리 중 오류가 발생했습니다.", "error");
                   }
               }
           });
       });
    }
 });
