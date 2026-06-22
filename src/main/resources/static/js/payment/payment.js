document.addEventListener("DOMContentLoaded", function () {
    const paymentForm = document.querySelector("#paymentForm");
    const paymentBtn = document.querySelector("#payment-btn");
    const agreeAll = document.querySelector("#payAgreeAll");
    const agreeItems = document.querySelectorAll(".pay-agree-item");
    const payMethodLabels = document.querySelectorAll(".cc-pay-method");

    initPointUse();

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

    if (agreeAll) {
        agreeAll.addEventListener("change", function () {
            agreeItems.forEach(item => {
                item.checked = agreeAll.checked;
            });
        });
    }

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
            CcUI.toast("필수 약관에 동의해주세요.", "warning");
            return;
        }

        const formData = new FormData(paymentForm);
        const bookingId = Number(formData.get("bookingId"));
        const selectedMethod = formData.get("method");
        const usedPoint = getUsedPoint();

        if (!bookingId) {
            CcUI.toast("예매 정보를 찾을 수 없습니다.", "error");
            return;
        }

        if (!selectedMethod) {
            CcUI.toast("결제 수단을 선택해주세요.", "warning");
            return;
        }

        paymentBtn.disabled = true;

        try {
            const headers = {
                "Content-Type": "application/json"
            };

            const csrfHeaderName = document.querySelector("#csrfHeaderName");
            const csrfToken = document.querySelector("#csrfToken");

            const customerName = String(formData.get("customerName") || "");
            const customerEmail = String(formData.get("customerEmail") || "");
            const customerPhone = String(formData.get("customerPhone") || "")
                .trim()
                .replaceAll("-", "");

            if (csrfHeaderName && csrfToken && csrfHeaderName.value && csrfToken.value) {
                headers[csrfHeaderName.value] = csrfToken.value;
            }

            CcUI.loading.show("처리 중입니다...");

            const { res, data } = await apiPost("/api/payments/prepare", {
                bookingId: bookingId,
                method: selectedMethod,
                usedPoint: usedPoint
            });

            CcUI.loading.hide();

            if (!res || !res.ok) {
                CcUI.toast(data?.message || data?.body || "결제 준비에 실패하였습니다.", "error");
                return;
            }

            const prepareData = data?.body ?? data;

            if (prepareData.amount === null || prepareData.amount === undefined || prepareData.amount < 0) {
                CcUI.alert("결제 금액이 올바르지 않습니다.", "error");
                return;
            }

            if (!prepareData.paymentId) {
                CcUI.alert("결제 ID가 없습니다.", "error");
                return;
            }

            console.log("prepare 응답:", prepareData);
            console.log("원래 금액:", prepareData.originalAmount);
            console.log("사용 포인트:", prepareData.usedPoint);
            console.log("카카오페이에 넘길 금액:", prepareData.amount);

            /*
             * 포인트 전액 결제
             * amount가 0이면 PortOne 결제창을 띄우면 안 됨.
             * 바로 서버에 결제 완료 검증 요청.
             */
            if (prepareData.amount === 0) {
                const completeRes = await fetch("/api/payments/complete", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        paymentId: prepareData.paymentId
                    })
                });

                if (!completeRes.ok) {
                    const message = await readErrorMessage(completeRes, "결제 검증에 실패했습니다.");
                    CcUI.toast(message, "error");
                    return;
                }

                CcUI.alert("포인트 결제가 완료되었습니다.", "success", () => {
                    location.href = "/booking/complete?paymentId=" + prepareData.paymentId;
                });

                return;
            }

            if (!prepareData.storeId || !prepareData.channelKey) {
                CcUI.alert("결제창 호출 정보가 부족합니다.", "error");
                return;
            }

            const paymentRequest = {
                storeId: prepareData.storeId,
                channelKey: prepareData.channelKey,
                paymentId: prepareData.paymentId,
                orderName: prepareData.orderName || "CatchCatch 좌석 예매",

                // 핵심: 화면 총액이 아니라 서버 prepare 응답의 amount 사용
                totalAmount: prepareData.amount,

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

            if (portOneResult.code !== undefined && portOneResult.code !== null) {
                CcUI.toast(portOneResult.message || "결제가 취소되었거나 실패했습니다.", "error");
                return;
            }

            if (selectedMethod === "vbank") {
                CcUI.toast("가상계좌가 발급되었습니다. 입금 확인 후 예매가 확정됩니다.", "info");
                location.href = "/users/bookings";
                return;
            }

            const completeRes = await fetch("/api/payments/complete", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    paymentId: prepareData.paymentId
                })
            });

            if (!completeRes.ok) {
                const message = await readErrorMessage(completeRes, "결제 검증에 실패했습니다.");
                CcUI.toast(message, "error");
                return;
            }

            await completeRes.json();

            CcUI.alert("결제가 완료되었습니다.", "success");
            location.href = "/payment/complete?paymentId=" + prepareData.paymentId;

        } catch (error) {
            console.error("결제 처리 오류:", error);

            if (error && error.message) {
                CcUI.alert("결제 처리 중 오류가 발생했습니다.\n" + error.message, "error");
                return;
            }

            CcUI.toast("결제 처리 중 오류가 발생했습니다. 개발자도구 콘솔을 확인해주세요.", "error");
        } finally {
            CcUI.loading.hide();
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
            return error.message || error.body || fallbackMessage;
        } catch (e) {
            return fallbackMessage;
        }
    }
});

function formatWon(amount) {
    return Number(amount || 0).toLocaleString() + "원";
}

function formatPoint(point) {
    return Number(point || 0).toLocaleString() + "P";
}

function toSafeNumber(value) {
    const number = Number(value);

    if (Number.isNaN(number) || number < 0) {
        return 0;
    }

    return Math.floor(number);
}

function initPointUse() {
    const usedPointInput = document.getElementById("usedPointInput");
    const btnUseMaxPoint = document.getElementById("btnUseMaxPoint");
    const usedPointText = document.getElementById("usedPointText");
    const finalAmountText = document.getElementById("finalAmountText");
    const maxPointText = document.getElementById("maxPointText");

    if (!usedPointInput || !usedPointText || !finalAmountText) {
        return;
    }

    const userPoint = toSafeNumber(usedPointInput.dataset.userPoint);
    const originalAmount = toSafeNumber(usedPointInput.dataset.originalAmount);
    const ticketFee = toSafeNumber(usedPointInput.dataset.ticketFee);
    const maxUsablePoint = Math.min(userPoint, originalAmount);

    usedPointInput.max = maxUsablePoint;

    if (maxPointText) {
        maxPointText.textContent = formatPoint(maxUsablePoint);
    }

    function updatePointSummary() {
        let usedPoint = toSafeNumber(usedPointInput.value);

        if (usedPoint > maxUsablePoint) {
            usedPoint = maxUsablePoint;
        }

        usedPointInput.value = usedPoint;

        const finalAmount = originalAmount +ticketFee - usedPoint;

        usedPointText.textContent = "-" + formatPoint(usedPoint);
        finalAmountText.textContent = formatWon(finalAmount);
    }

    usedPointInput.addEventListener("input", updatePointSummary);
    usedPointInput.addEventListener("blur", updatePointSummary);

    if (btnUseMaxPoint) {
        btnUseMaxPoint.addEventListener("click", function () {
            usedPointInput.value = maxUsablePoint;
            updatePointSummary();
        });
    }

    updatePointSummary();
}

function getUsedPoint() {
    const usedPointInput = document.getElementById("usedPointInput");

    if (!usedPointInput) {
        return 0;
    }

    return toSafeNumber(usedPointInput.value);
}