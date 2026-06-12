document.addEventListener("DOMContentLoaded", function () {
        const paymentForm = document.querySelector("#paymentForm");
        const paymentBtn = document.querySelector("#payment-btn");
        const agreeAll = document.querySelector("#payAgreeAll");
        const agreeItems = document.querySelectorAll(".pay-agree-item");
        const payMethodLabels = document.querySelectorAll(".cc-pay-method");

        payMethodLabels.forEach(label => {
            label.addEventListener("click", function () {
                payMethodLabels.forEach(item => {
                    item.classList.remove("is-active");
                });

                label.classList.add("is-active");
            });
        });

        if (!paymentForm || !paymentBtn) {
            console.error("paymentForm 또는 payment-btn을 찾을 수 없습니다.");
            return;
        }

        // 전체 동의 체크 시 필수 약관 모두 체크
        if (agreeAll) {
            agreeAll.addEventListener("change", function () {
                agreeItems.forEach(item => {
                    item.checked = agreeAll.checked;
                });
            });
        }

        // 개별 약관 체크 상태에 따라 전체 동의 갱신
        agreeItems.forEach(item => {
            item.addEventListener("change", function () {
                if (agreeAll) {
                    agreeAll.checked = Array.from(agreeItems).every(i => i.checked);
                }
            });
        });

        paymentBtn.addEventListener("click", async function () {
            if (!paymentForm.checkValidity()) {
                paymentForm.reportValidity();
                CcUI.toast("필수 약관에 동의해주세요.", 'warning');
                return;
            }

            const formData = new FormData(paymentForm);
            const bookingId = Number(formData.get("bookingId"));
            const selectedMethod = formData.get("method");

            if (!bookingId) {
                CcUI.toast("예매 정보를 찾을 수 없습니다.", 'error');
                return;
            }

            if (!selectedMethod) {
                CcUI.toast("결제 수단을 선택해주세요.", 'warning');
                return;
            }

            paymentBtn.disabled = true;

            try {
                const headers = {
                    "Content-Type": "application/json"
                };

                const csrfHeaderName = document.querySelector("#csrfHeaderName");
                const csrfToken = document.querySelector("#csrfToken");
                const customerName = String(formData.get("customerName"));
                const customerEmail = String(formData.get("customerEmail"));
                const customerPhone = String(formData.get("customerPhone") || "").trim().replaceAll("-", "");

                if (csrfHeaderName && csrfToken && csrfHeaderName.value && csrfToken.value) {
                    headers[csrfHeaderName.value] = csrfToken.value;
                }

                // 1. 서버에 결제 준비 요청
                // amount는 화면에서 보내지 않고, 서버가 bookingId 기준으로 계산한다.
                CcUI.loading.show('처리 중입니다...');
                const {res, data} = await apiPost("/api/payments/prepare", {
                    bookingId: bookingId,
                    method: selectedMethod
                });
                CcUI.loading.hide();

                if (!res || !res.ok) {
                    CcUI.toast(data?.message || '결제 준비에 실패하였습니다.', 'error');
                    return;
                }

                if(!data.amount || data.amount <= 0){
                    CcUI.alert("결제 금액이 올바르지 않습니다.")
                }

                if(!data.storeId || !data.channelKey || !data.paymentId){
                    CcUI.alert("결제창 호출 정보가 부족합니다.")
                }

                console.log("prepare 응답:", data);
                console.log("선택 결제수단:", selectedMethod);
                console.log("PortOne 객체:", window.PortOne);

                // 2. 포트원 결제창 호출
                const paymentRequest = {
                    storeId: data.storeId,
                    channelKey: data.channelKey,
                    paymentId: data.paymentId,
                    orderName: data.orderName || "CatchCatch 좌석 예매",
                    totalAmount: data.amount,
                    currency: "CURRENCY_KRW",
                    payMethod: toPortOnePayMethod(selectedMethod),
                    customer: {
                        fullName: customerName,
                        email: customerEmail,
                        phoneNumber: customerPhone
                    }
                };

                if (selectedMethod === "vbank") {
                    paymentRequest.virtualAccount = {
                        accountExpiry: {
                            validHours: 24
                        },
                        cashReceiptType: "ANONYMOUS"
                    };
                }

                const portOneResult = await PortOne.requestPayment(paymentRequest);

                // 3. 결제 실패 또는 취소
                if (portOneResult.code !== undefined && portOneResult.code !== null) {
                    CcUI.toast(portOneResult.message || "결제가 취소되었거나 실패했습니다.", 'error');
                    return;
                }

                if (selectedMethod === "vbank") {
                    CcUI.toast("가상계좌가 발급되었습니다. 입금 확인 후 예매가 확정됩니다.", 'info');
                    location.href = "/users/bookings";
                    return;
                }

                // 4. 서버에 결제 완료 검증 요청
                const completeRes = await fetch("/api/payments/complete", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        paymentId: data.paymentId
                    })
                });

                if (!completeRes.ok) {
                    const message = await readErrorMessage(completeRes, "결제 검증에 실패했습니다.");
                    CcUI.toast(message, 'error');
                    return;
                }

                const complete = await completeRes.json();

                CcUI.alert('결제가 완료되었습니다.', 'success', () => {
                    location.href = "/booking/complete?paymentId=" + data.paymentId;
                    // 결제 상세 화면으로 바로 이동하고 싶으면 위 줄 대신 아래 사용
                    // location.href = "/users/payments/" + complete.paymentPk;
                });


            } catch (error) {
                  console.error("결제 처리 오류:", error);

                  if (error && error.message) {
                      CcUI.alert("결제 처리 중 오류가 발생했습니다.\n" + error.message, 'error');
                      return;
                  }

                  CcUI.toast("결제 처리 중 오류가 발생했습니다. 개발자도구 콘솔을 확인해주세요.", 'error');
              } finally {
                paymentBtn.disabled = false;
              }
        });

        function toPortOnePayMethod(method) {
            if (method === "card") {
                return "CARD";
            }

            if (method === "kakaopay" || method === "tosspay") {
                return "EASY_PAY";
            }

            if (method === "vbank") {
                return "VIRTUAL_ACCOUNT";
            }

            return "CARD";
        }

        async function readErrorMessage(response, fallbackMessage) {
            try {
                const error = await response.json();
                return error.message || fallbackMessage;
            } catch (e) {
                return fallbackMessage;
            }
        }
    });