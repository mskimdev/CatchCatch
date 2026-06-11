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
                alert("필수 약관에 동의해주세요.");
                return;
            }

            const formData = new FormData(paymentForm);
            const bookingId = Number(formData.get("bookingId"));
            const selectedMethod = formData.get("method");

            if (!bookingId) {
                alert("예매 정보를 찾을 수 없습니다.");
                return;
            }

            if (!selectedMethod) {
                alert("결제 수단을 선택해주세요.");
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
                const prepareRes = await fetch("/api/payments/prepare", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        bookingId: bookingId,
                        method: selectedMethod
                    })
                });

                if (!prepareRes.ok) {
                    const message = await readErrorMessage(prepareRes, "결제 준비 중 오류가 발생했습니다.");
                    alert(message);
                    return;
                }

                const prepare = await prepareRes.json();

                if (!prepare.amount || prepare.amount <= 0) {
                    alert("결제 금액이 올바르지 않습니다.");
                    return;
                }

                if (!prepare.storeId || !prepare.channelKey || !prepare.paymentId) {
                    alert("결제창 호출 정보가 부족합니다.");
                    return;
                }

                console.log("prepare 응답:", prepare);
                console.log("선택 결제수단:", selectedMethod);
                console.log("PortOne 객체:", window.PortOne);

                // 2. 포트원 결제창 호출
                const paymentRequest = {
                    storeId: prepare.storeId,
                    channelKey: prepare.channelKey,
                    paymentId: prepare.paymentId,
                    orderName: prepare.orderName || "CatchCatch 좌석 예매",
                    totalAmount: prepare.amount,
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
                    alert(portOneResult.message || "결제가 취소되었거나 실패했습니다.");
                    return;
                }

                if (selectedMethod === "vbank") {
                    alert("가상계좌가 발급되었습니다. 입금 확인 후 예매가 확정됩니다.");
                    location.href = "/users/bookings";
                    return;
                }

                // 4. 서버에 결제 완료 검증 요청
                const completeRes = await fetch("/api/payments/complete", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        paymentId: prepare.paymentId
                    })
                });

                if (!completeRes.ok) {
                    const message = await readErrorMessage(completeRes, "결제 검증에 실패했습니다.");
                    alert(message);
                    return;
                }

                const complete = await completeRes.json();

                alert("결제가 완료되었습니다.");

                // 기존 booking complete 화면을 쓸 경우
                location.href = "/booking/complete?paymentId=" + prepare.paymentId;

                // 결제 상세 화면으로 바로 이동하고 싶으면 위 줄 대신 아래 사용
                // location.href = "/users/payments/" + complete.paymentPk;

            } catch (error) {
                  console.error("결제 처리 오류:", error);

                  if (error && error.message) {
                      alert("결제 처리 중 오류가 발생했습니다.\n" + error.message);
                      return;
                  }

                  alert("결제 처리 중 오류가 발생했습니다. 개발자도구 콘솔을 확인해주세요.");
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