export async function render(el: HTMLElement): Promise<void> {
    el.innerHTML = `
      <div class="admin-banner d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div class="d-flex align-items-center gap-3">
          <span class="admin-banner-icon"><i class="bi bi-search" aria-hidden="true"></i></span>
          <div>
            <div class="admin-eyebrow">Administration</div>
            <h4 class="page-title">inquire User Rights-Given User</h4>
          </div>
        </div>
        <a href="/usrenter" data-link class="btn btn-outline-primary">
          <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>Back to User Rights
        </a>
      </div>`;
}
