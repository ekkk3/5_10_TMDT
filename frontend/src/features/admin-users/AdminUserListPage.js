import { adminUserService } from '../../services/adminUserService.js';

const INTERNAL_ROLES = ['ADMIN', 'MANAGER', 'KITCHEN', 'CSKH', 'MARKETING', 'DELIVERY'];
const STATUSES = ['ACTIVE', 'LOCKED', 'INACTIVE'];

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const renderOptions = (options, selectedValue = '') =>
  options.map((option) => `<option value="${option}" ${selectedValue === option ? 'selected' : ''}>${option}</option>`).join('');

const renderFieldError = (errors = {}, fieldName) =>
  errors[fieldName] ? `<p class="admin-users-field__error">${escapeHtml(errors[fieldName])}</p>` : '';

const pageStyles = `
  <style>
    .admin-users-page { display: grid; gap: 18px; }
    .admin-users-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; }
    .admin-users-header h1 { margin: 0 0 8px; font-size: 32px; }
    .admin-users-header p { margin: 0; color: var(--muted); line-height: 1.5; }
    .admin-users-filters, .admin-users-form { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .admin-users-filters { grid-template-columns: minmax(180px, 1fr) 160px 160px auto; align-items: end; }
    .admin-users-form { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .admin-users-field { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 800; }
    .admin-users-field input, .admin-users-field select { width: 100%; min-height: 42px; border: 1px solid var(--line); border-radius: 6px; padding: 9px 10px; color: var(--ink); font: inherit; background: #fff; }
    .admin-users-field.has-error input, .admin-users-field.has-error select { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.1); }
    .admin-users-field__error { margin: 0; color: #b3261e; font-size: 13px; line-height: 1.35; }
    .admin-users-form-actions { display: flex; gap: 10px; align-items: end; }
    .admin-users-panel { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .admin-users-table { width: 100%; min-width: 900px; border-collapse: collapse; }
    .admin-users-table th, .admin-users-table td { padding: 12px 14px; border-bottom: 1px solid #ffe0aa; text-align: left; vertical-align: top; }
    .admin-users-table th { color: var(--muted); font-size: 13px; background: #fffaf3; }
    .admin-users-table tr:last-child td { border-bottom: 0; }
    .admin-users-role, .admin-users-status { display: inline-flex; min-height: 26px; align-items: center; padding: 4px 8px; border-radius: 6px; background: #fff1cc; color: #7a2d00; font-size: 12px; font-weight: 900; }
    .admin-users-status.LOCKED, .admin-users-status.INACTIVE { color: #9f1f18; background: #fff0ef; }
    .admin-users-status.ACTIVE { color: #0f5c36; background: #e8f7ef; }
    .admin-users-muted { display: block; margin-top: 4px; color: var(--muted); font-size: 13px; }
    .admin-users-actions { display: flex; flex-wrap: wrap; gap: 7px; }
    .admin-users-action { min-height: 34px; border: 0; border-radius: 6px; padding: 8px 10px; cursor: pointer; font-weight: 800; }
    .admin-users-action.edit { color: var(--ink); background: var(--gold); }
    .admin-users-action.lock { color: #fff; background: var(--red); }
    .admin-users-action.unlock { color: #fff; background: #128247; }
    .admin-users-message { padding: 12px 14px; border-radius: 8px; font-weight: 800; }
    .admin-users-message.error { border: 1px solid #f2b8b5; color: #9f1f18; background: #fff7f6; }
    .admin-users-message.success { border: 1px solid #b8dfca; color: #0f5c36; background: #effaf4; }
    @media (max-width: 900px) {
      .admin-users-header { display: grid; }
      .admin-users-filters, .admin-users-form { grid-template-columns: 1fr 1fr; }
      .admin-users-form-actions { grid-column: 1 / -1; }
    }
    @media (max-width: 640px) {
      .admin-users-filters, .admin-users-form { grid-template-columns: 1fr; }
      .admin-users-form-actions, .admin-users-form-actions .button, .admin-users-filters .button { width: 100%; }
    }
  </style>
`;

const emptyForm = {
  user_id: '',
  full_name: '',
  email: '',
  phone: '',
  role_name: 'KITCHEN',
  status: 'ACTIVE',
  password: ''
};

const validateForm = (values = {}, isEditing = false) => {
  const errors = {};

  if (!values.full_name.trim()) errors.full_name = 'Vui lòng nhập họ tên';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Email không đúng định dạng';
  if (values.phone && !/^(0\d{9}|\+84\d{9})$/.test(values.phone.replace(/[\s.-]/g, ''))) errors.phone = 'Số điện thoại không đúng định dạng';
  if (!values.email && !values.phone) errors.contact = 'Vui lòng nhập email hoặc số điện thoại';
  if (!INTERNAL_ROLES.includes(values.role_name)) errors.role_name = 'Vai trò không hợp lệ';
  if (!STATUSES.includes(values.status)) errors.status = 'Trạng thái không hợp lệ';
  if (!isEditing && String(values.password || '').length < 8) errors.password = 'Mật khẩu tối thiểu 8 ký tự';
  if (isEditing && values.password && values.password.length < 8) errors.password = 'Mật khẩu tối thiểu 8 ký tự';

  return errors;
};

const renderFilters = (filters = {}) => `
  <form class="admin-users-filters" data-admin-user-filters>
    <label class="admin-users-field">
      Tìm tài khoản
      <input name="keyword" value="${escapeHtml(filters.keyword || '')}" placeholder="Tên, email, SĐT..." />
    </label>
    <label class="admin-users-field">
      Vai tro
      <select name="role">
        <option value="">Tất cả</option>
        ${renderOptions(INTERNAL_ROLES, filters.role)}
      </select>
    </label>
    <label class="admin-users-field">
      Trạng thái
      <select name="status">
        <option value="">Tất cả</option>
        ${renderOptions(STATUSES, filters.status)}
      </select>
    </label>
    <button class="button button-primary" type="submit">Loc</button>
  </form>
`;

const renderForm = ({ values = emptyForm, fieldErrors = {}, isSubmitting = false } = {}) => {
  const isEditing = Boolean(values.user_id);

  return `
    <form class="admin-users-form" data-admin-user-form>
      ${fieldErrors.contact ? `<div class="admin-users-message error">${escapeHtml(fieldErrors.contact)}</div>` : ''}
      <label class="admin-users-field ${fieldErrors.full_name ? 'has-error' : ''}">
        Họ tên
        <input name="full_name" maxlength="100" value="${escapeHtml(values.full_name || '')}" />
        ${renderFieldError(fieldErrors, 'full_name')}
      </label>
      <label class="admin-users-field ${fieldErrors.email ? 'has-error' : ''}">
        Email
        <input name="email" type="email" value="${escapeHtml(values.email || '')}" />
        ${renderFieldError(fieldErrors, 'email')}
      </label>
      <label class="admin-users-field ${fieldErrors.phone ? 'has-error' : ''}">
        Số điện thoại
        <input name="phone" type="tel" value="${escapeHtml(values.phone || '')}" />
        ${renderFieldError(fieldErrors, 'phone')}
      </label>
      <label class="admin-users-field ${fieldErrors.role_name ? 'has-error' : ''}">
        Vai tro
        <select name="role_name">${renderOptions(INTERNAL_ROLES, values.role_name)}</select>
        ${renderFieldError(fieldErrors, 'role_name')}
      </label>
      <label class="admin-users-field ${fieldErrors.status ? 'has-error' : ''}">
        Trạng thái
        <select name="status">${renderOptions(STATUSES, values.status)}</select>
        ${renderFieldError(fieldErrors, 'status')}
      </label>
      <label class="admin-users-field ${fieldErrors.password ? 'has-error' : ''}">
        Mật khẩu ${isEditing ? 'moi' : ''}
        <input name="password" type="password" autocomplete="new-password" placeholder="${isEditing ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'}" />
        ${renderFieldError(fieldErrors, 'password')}
      </label>
      <div class="admin-users-form-actions">
        <button class="button button-primary" type="submit" ${isSubmitting ? 'disabled' : ''}>${isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo nhân viên'}</button>
        ${isEditing ? '<button class="button button-secondary" type="button" data-reset-user-form>Hủy sua</button>' : ''}
      </div>
    </form>
  `;
};

const renderRows = (users = []) => {
  if (!users.length) {
    return '<tr><td colspan="6"><div class="admin-users-message">Chưa có tài khoản phù hợp.</div></td></tr>';
  }

  return users
    .map(
      (user) => `
        <tr>
          <td>
            <strong>${escapeHtml(user.full_name)}</strong>
            <span class="admin-users-muted">#${Number(user.user_id)}</span>
          </td>
          <td>
            ${escapeHtml(user.email || '-')}
            <span class="admin-users-muted">${escapeHtml(user.phone || '-')}</span>
          </td>
          <td><span class="admin-users-role">${escapeHtml(user.role_name)}</span></td>
          <td><span class="admin-users-status ${escapeHtml(user.status)}">${escapeHtml(user.status)}</span></td>
          <td>${escapeHtml(user.created_at ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(user.created_at)) : '-')}</td>
          <td>
            <div class="admin-users-actions">
              <button class="admin-users-action edit" type="button" data-edit-user="${user.user_id}">Sửa</button>
              ${
                user.status === 'LOCKED'
                  ? `<button class="admin-users-action unlock" type="button" data-unlock-user="${user.user_id}">Mở khóa</button>`
                  : `<button class="admin-users-action lock" type="button" data-lock-user="${user.user_id}">Khóa</button>`
              }
            </div>
          </td>
        </tr>
      `
    )
    .join('');
};

const renderTable = (users = []) => `
  <div class="admin-users-panel">
    <table class="admin-users-table">
      <thead>
        <tr>
          <th>Tài khoản</th>
          <th>Lien he</th>
          <th>Vai tro</th>
          <th>Trạng thái</th>
          <th>Ngày tạo</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>${renderRows(users)}</tbody>
    </table>
  </div>
`;

const renderPageBody = ({ filters = {}, users = [], formValues = emptyForm, fieldErrors = {}, isLoading = false, isSubmitting = false, error = '', success = '' } = {}) => `
  <div class="admin-users-header">
    <div>
      <h1>Quản lý tài khoản</h1>
      <p>Tạo, cập nhật, khóa tài khoản nhân viên nội bộ và gán role phù hợp với quyền vận hành.</p>
    </div>
    <button class="button button-secondary" type="button" data-refresh-users>${isLoading ? 'Đang tải...' : 'Làm mới'}</button>
  </div>
  ${renderFilters(filters)}
  ${error ? `<div class="admin-users-message error" role="alert">${escapeHtml(error)}</div>` : ''}
  ${success ? `<div class="admin-users-message success">${escapeHtml(success)}</div>` : ''}
  ${renderForm({ values: formValues, fieldErrors, isSubmitting })}
  ${renderTable(users)}
`;

export const AdminUserListPage = () => `
  ${pageStyles}
  <section class="admin-users-page" data-admin-users-page>
    ${renderPageBody({ isLoading: true })}
  </section>
`;

export const mountAdminUserListPage = () => {
  const root = document.querySelector('[data-admin-users-page]');
  if (!root) return;

  let filters = { keyword: '', role: '', status: '' };
  let users = [];
  let formValues = { ...emptyForm };
  let fieldErrors = {};
  let isLoading = false;
  let isSubmitting = false;
  let error = '';
  let success = '';

  const render = () => {
    root.innerHTML = renderPageBody({ filters, users, formValues, fieldErrors, isLoading, isSubmitting, error, success });
  };

  const loadUsers = async () => {
    isLoading = true;
    error = '';
    render();

    try {
      const data = await adminUserService.getUsers(filters);
      users = data.users || [];
    } catch (requestError) {
      error = requestError?.message || 'Không thể tải danh sách tài khoản.';
    } finally {
      isLoading = false;
      render();
    }
  };

  root.addEventListener('submit', async (event) => {
    const filterForm = event.target.closest('[data-admin-user-filters]');
    const userForm = event.target.closest('[data-admin-user-form]');

    if (filterForm) {
      event.preventDefault();
      const formData = new FormData(filterForm);
      filters = {
        keyword: String(formData.get('keyword') || '').trim(),
        role: String(formData.get('role') || '').trim(),
        status: String(formData.get('status') || '').trim()
      };
      await loadUsers();
      return;
    }

    if (!userForm) return;

    event.preventDefault();
    const formData = new FormData(userForm);
    const isEditing = Boolean(formValues.user_id);
    const values = {
      ...formValues,
      full_name: String(formData.get('full_name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      role_name: String(formData.get('role_name') || '').trim(),
      status: String(formData.get('status') || '').trim(),
      password: String(formData.get('password') || '')
    };

    fieldErrors = validateForm(values, isEditing);
    error = '';
    success = '';

    if (Object.keys(fieldErrors).length) {
      formValues = values;
      render();
      return;
    }

    const payload = {
      full_name: values.full_name,
      email: values.email || null,
      phone: values.phone || null,
      role_name: values.role_name,
      status: values.status
    };

    if (values.password) {
      payload.password = values.password;
    }

    try {
      isSubmitting = true;
      formValues = values;
      render();

      if (isEditing) {
        await adminUserService.updateUser(values.user_id, payload);
        success = 'Đã cập nhật tài khoản nhân viên.';
      } else {
        await adminUserService.createUser(payload);
        success = 'Đã tạo tài khoản nhân viên.';
      }

      formValues = { ...emptyForm };
      fieldErrors = {};
      await loadUsers();
    } catch (requestError) {
      fieldErrors = requestError?.errors && typeof requestError.errors === 'object' ? requestError.errors : {};
      error = requestError?.message || 'Không thể lưu tài khoản.';
    } finally {
      isSubmitting = false;
      render();
    }
  });

  root.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-user]');
    const lockButton = event.target.closest('[data-lock-user]');
    const unlockButton = event.target.closest('[data-unlock-user]');
    const resetButton = event.target.closest('[data-reset-user-form]');
    const refreshButton = event.target.closest('[data-refresh-users]');

    if (editButton) {
      const user = users.find((item) => String(item.user_id) === String(editButton.dataset.editUser));
      if (user) {
        formValues = { ...emptyForm, ...user, password: '' };
        fieldErrors = {};
        success = '';
        error = '';
        render();
      }
      return;
    }

    if (resetButton) {
      formValues = { ...emptyForm };
      fieldErrors = {};
      render();
      return;
    }

    if (lockButton || unlockButton) {
      const userId = lockButton?.dataset.lockUser || unlockButton?.dataset.unlockUser;
      try {
        if (lockButton) {
          await adminUserService.lockUser(userId);
          success = 'Đã khóa tài khoản.';
        } else {
          await adminUserService.unlockUser(userId);
          success = 'Đã mở khóa tài khoản.';
        }
        await loadUsers();
      } catch (requestError) {
        error = requestError?.message || 'Không thể cập nhật trạng thái tài khoản.';
        render();
      }
      return;
    }

    if (refreshButton) {
      await loadUsers();
    }
  });

  loadUsers();
};
