function navigate(params) {
    const url = new URL(location.href);
    Object.entries(params).forEach(([k, v]) => {
        if (v === null || v === '') {
            url.searchParams.delete(k);
        } else {
            url.searchParams.set(k, v);
        }
    });
    location.href = url.toString();
}

document.querySelectorAll('.cc-faq-tab[data-status]').forEach(function (tab) {
    tab.addEventListener('click', function () {
        const status = this.dataset.status;
        navigate({ status: status || null, myOnly: null });
    });
});

const myOnlyTab = document.getElementById('myOnlyTab');
if (myOnlyTab) {
    myOnlyTab.addEventListener('click', function () {
        navigate({ myOnly: 'true', status: null });
    });
}

const toggle = document.getElementById('publicOnlyToggle');
if (toggle) {
    toggle.addEventListener('change', function () {
        navigate({ publicOnly: this.checked ? 'true' : null });
    });
}

const sortSelect = document.getElementById('sortSelect');
if (sortSelect) {
    sortSelect.addEventListener('change', function () {
        navigate({ sort: this.value });
    });
}