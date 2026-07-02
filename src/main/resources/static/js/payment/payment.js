document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPaymentId = urlParams.get("paymentId");

    if (redirectPaymentId) {
        CcUI.loading.show("결제를 확인하고 있습니다...");

        try {
            const csrfHeaderName = document.querySelector("#csrfHeaderName")?.value;
            const csrfToken = document.querySelector("#csrfToken")?.value;
            const headers = { "Content-Type": "application/json" };

            if (csrfHeaderName && csrfToken) {
                headers[csrfHeaderName] = csrfToken;
            }

            const smsPayload = { notifySms: false, smsPhone: null, updateProfile: false };

            const completeRes = await fetch("/api/payments/complete", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    paymentId: redirectPaymentId,
                    ...smsPayload
                })
            });

            if (!completeRes.ok) {
                const errorData = await completeRes.json();
                CcUI.alert(errorData.message || "결제 검증에 실패했습니다.", "error", () => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                });
                return;
            }

            CcUI.alert("결제가 완료되었습니다.", "success", () => {
                location.href = "/payment/complete?paymentId=" + redirectPaymentId;
            });
            return;

        } catch (error) {
            CcUI.toast("검증 중 오류가 발생했습니다.", "error");
        } finally {
            CcUI.loading.hide();
        }
    }


    const paymentForm = document.querySelector("#paymentForm");
    const paymentBtn = document.querySelector("#payment-btn");
    const cancelBtn = document.querySelector("#booking-cancel-btn");
    const agreeAll = document.querySelector("#payAgreeAll");
    const agreeItems = document.querySelectorAll(".pay-agree-item");
    const payMethodLabels = document.querySelectorAll(".cc-pay-method");

    initPaymentCountdown();
    initSmsToggle();
    initPointUse();

    if (cancelBtn) {
        cancelBtn.addEventListener("click", async function () {
            const bookingId = Number(new FormData(paymentForm).get("bookingId"));

            if (!bookingId) {
                CcUI.toast("예매 정보를 찾을 수 없습니다.", "error");
                return;
            }

            CcUI.confirm({
                title: "예매를 취소하시겠습니까?",
                confirmText: "예매취소",
                danger: true,
                onConfirm: async () => {
                    cancelBtn.disabled = true;

                    const { res, data } = await apiPost(`/booking/${bookingId}/cancel`, {});

                    cancelBtn.disabled = false;

                    if (!res || !res.ok) {
                        CcUI.toast(data?.msg || "예매 취소에 실패했습니다.", "error");
                        return;
                    }

                    CcUI.alert("예매가 취소되었습니다.", "success", () => {
                        location.href = "/users/bookings";
                    });
                }
            });
        });
    }

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

            const smsPayload = getSmsPayload();

            if (prepareData.amount === 0) {
                const completeRes = await fetch("/api/payments/complete", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        paymentId: prepareData.paymentId,
                        ...smsPayload
                    })
                });

                if (!completeRes.ok) {
                    const message = await readErrorMessage(completeRes, "결제 검증에 실패했습니다.");
                    CcUI.toast(message, "error");
                    return;
                }

                CcUI.alert("포인트 결제가 완료되었습니다.", "success", () => {
                    location.href = "/payment/complete?paymentId=" + prepareData.paymentId;
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
                totalAmount: prepareData.amount,
                currency: "CURRENCY_KRW",
                payMethod: toPortOnePayMethod(selectedMethod),
                customer: {
                    fullName: customerName,
                    email: customerEmail,
                    phoneNumber: customerPhone
                },
                redirectUrl: window.location.href
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

            // 카카오페이 등 iframe 방식인 경우에만 이 코드가 마저 실행됩니다.
            const completeRes = await fetch("/api/payments/complete", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    paymentId: prepareData.paymentId,
                    ...smsPayload
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



    function initPaymentCountdown() {
        const expiresAtInput = document.querySelector("#bookingExpiresAt");
        const countdownEl = document.querySelector("#paymentCountdown");

        if (!expiresAtInput || !countdownEl) return;

        const expiresAtMillis = Number(expiresAtInput.value);

        if (!expiresAtMillis) return;

        let expired = false;

        function tick() {
            if (expired) return;

            const remainMs = expiresAtMillis - Date.now();

            if (remainMs <= 0) {
                expired = true;
                countdownEl.textContent = "00:00";

                if (paymentBtn) paymentBtn.disabled = true;
                if (cancelBtn) cancelBtn.disabled = true;

                CcUI.alert(
                    "좌석 점유 시간이 만료되어 좌석이 해제되었습니다.\n처음부터 다시 선택해주세요.",
                    "warning",
                    () => { location.href = "/"; }
                );
                return;
            }

            const remainSeconds = Math.floor(remainMs / 1000);
            const minute = String(Math.floor(remainSeconds / 60)).padStart(2, "0");
            const second = String(remainSeconds % 60).padStart(2, "0");
            countdownEl.textContent = `${minute}:${second}`;

            window.setTimeout(tick, 1000);
        }

        tick();
    }

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
// 👆 DOMContentLoaded 종료 괄호


// 👇 여기서부터는 전역 함수들입니다.
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

        const finalAmount = originalAmount + ticketFee - usedPoint;

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

function initSmsToggle() {
    const notifySmsEl = document.querySelector("#notifySms");
    const smsPhoneWrap = document.querySelector("#smsPhoneWrap");

    if (!notifySmsEl || !smsPhoneWrap) return;

    smsPhoneWrap.classList.add("is-hidden");

    notifySmsEl.addEventListener("change", function () {
        smsPhoneWrap.classList.toggle("is-hidden", !notifySmsEl.checked);
    });
}

function getSmsPayload() {
    const notifySmsEl = document.querySelector("#notifySms");
    const smsPhoneEl = document.querySelector("#smsPhone");
    const updateProfileEl = document.querySelector("#updateProfile");

    const notifySms = notifySmsEl ? notifySmsEl.checked : false;
    const smsPhone = smsPhoneEl ? smsPhoneEl.value.trim() : null;
    const updateProfile = updateProfileEl ? updateProfileEl.checked : false;

    return { notifySms, smsPhone, updateProfile };
}

function getUsedPoint() {
    const usedPointInput = document.getElementById("usedPointInput");

    if (!usedPointInput) {
        return 0;
    }

    return toSafeNumber(usedPointInput.value);
}