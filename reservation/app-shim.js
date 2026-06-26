// GAS の google.script.run 互換シム。
// 各 *ForClient メソッドを api.php(JSON) へ転送し、成功/失敗ハンドラを呼ぶ。
(function () {
  const MAP = {
    getSchoolsForClient:          ['getSchools',            () => ({})],
    getSlotsForClient:            ['getSlots',              (schoolId) => ({ schoolId })],
    getMyBookingsForClient:       ['getMyBookings',         (email) => ({ email })],
    createBookingForClient:       ['createBooking',         (p) => p],
    updateBookingForClient:       ['updateBooking',         (p) => p],
    cancelBookingForClient:       ['cancelBooking',         (p) => p],
    admin_getAllSlotsForClient:   ['admin_getAllSlots',     (schoolId) => ({ schoolId })],
    admin_getAllBookingsForClient:['admin_getAllBookings',  (schoolId) => ({ schoolId })],
    admin_addSlotsForClient:      ['admin_addSlots',        (p) => p],
    admin_updateSlotForClient:    ['admin_updateSlot',      (p) => p],
    admin_bulkUpdateCapacityForClient: ['admin_bulkUpdateCapacity', (p) => p],
    admin_deleteSlotForClient:    ['admin_deleteSlot',      (p) => p],
    admin_deleteSlotsForClient:   ['admin_deleteSlots',     (p) => p],
    admin_cancelBookingForClient: ['admin_cancelBooking',   (p) => p],
    admin_updateBookingForClient: ['admin_updateBooking',   (p) => p],
  };

  function makeRunner() {
    let onSuccess = null, onFailure = null;
    const runner = {
      withSuccessHandler(fn) { onSuccess = fn; return runner; },
      withFailureHandler(fn) { onFailure = fn; return runner; },
    };
    Object.keys(MAP).forEach((method) => {
      runner[method] = function (arg) {
        const [action, toPayload] = MAP[method];
        const payload = Object.assign({ action }, toPayload(arg) || {});
        fetch('api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((r) => r.json())
          .then((data) => { onSuccess && onSuccess(data); })
          .catch((err) => { onFailure && onFailure(err); });
      };
    });
    return runner;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  // 毎回新しい runner を返す(同時呼び出しでハンドラが混ざらないように)
  Object.defineProperty(window.google.script, 'run', { get: makeRunner });

  // 簡易ログインAPI(管理画面用)
  window.apiPost = function (payload) {
    return fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
  };
})();
