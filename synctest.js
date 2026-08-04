/* 云同步层离线测试：用 stub 模拟 Supabase + localStorage + DOM */
const fs = require('fs'), vm = require('vm');
const h = fs.readFileSync('repo/index.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, code = '';
while ((m = re.exec(h))) code += m[1] + '\n';

const start = code.indexOf('const CLOUD_TABLE=');
const end = code.indexOf('/* ====== 数据层：获取记录 ====== */');
if (start < 0 || end < 0) { console.error('未定位到同步层代码'); process.exit(1); }
const seg = code.slice(start, end);

function makeLS() {
  const store = {};
  return {
    _store: store,
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
}

function build({ cloudRows = [], failCode = null, failMsg = '' } = {}) {
  const pushes = [];
  const toasts = [];
  const sb = {
    from() {
      return {
        select() {
          if (failCode) return Promise.resolve({ data: null, error: { code: failCode, message: failMsg } });
          return Promise.resolve({ data: cloudRows, error: null });
        },
        upsert(row) {
          if (failCode) return Promise.resolve({ error: { code: failCode, message: failMsg } });
          pushes.push(row);
          return Promise.resolve({ error: null });
        }
      };
    }
  };
  const sandbox = {
    console, setTimeout, clearTimeout, Math, Date, JSON, Object, Array, String, Number,
    localStorage: makeLS(),
    sb, cloudMode: true, currentUser: { id: 'u-1' },
    kcData: { raw: [{ id: 'RAW-L' }], unit: [], output: [] },
    inboxData: [{ id: 1, trigger: '本地候选' }],
    projData: [{ id: 'P-L', title: '本地项目' }],
    recallLog: { 'KU-1': 3 },
    toast: msg => toasts.push(msg),
    confirm: () => true,
    updateSyncBadge: () => {},
    document: { getElementById: () => null }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(seg, sandbox);
  // 顶层 let 声明不会挂到 sandbox 对象上，需在同一 context 中求值读取
  const readState = () => vm.runInContext('syncState', sandbox);
  const setSeeding = v => vm.runInContext('_seedingDemo=' + (v ? 'true' : 'false'), sandbox);
  setSeeding(false); // 默认模拟「启动初始化已结束」
  return { sandbox, pushes, toasts, readState, setSeeding };
}

(async () => {
  let pass = 0, fail = 0;
  const ok = (name, cond, extra) => {
    if (cond) { pass++; console.log('  PASS  ' + name); }
    else { fail++; console.log('  FAIL  ' + name + (extra ? ' → ' + extra : '')); }
  };

  // 场景 1：云端为空 → 首次把本地 4 个域全部上传
  console.log('\n[场景1] 云端无数据，首次登录');
  {
    const { sandbox, pushes, readState } = build({ cloudRows: [] });
    await sandbox.cloudPullAll();
    const keys = pushes.map(p => p.key).sort();
    ok('4 个域全部上传', pushes.length === 4, '实际 ' + pushes.length);
    ok('域名正确 (inbox/kc/proj/recall)', keys.join(',') === 'inbox,kc,proj,recall', keys.join(','));
    ok('payload 带本地数据', pushes.find(p => p.key === 'proj').data.payload[0].title === '本地项目');
    ok('同步状态 = synced', readState() === 'synced', readState());
  }

  // 场景 2：云端较新 → 拉取覆盖本地
  console.log('\n[场景2] 云端数据更新（他设备已改），应覆盖本地');
  {
    const future = new Date(Date.now() + 600000).toISOString();
    const { sandbox, toasts } = build({
      cloudRows: [
        { key: 'proj', updated_at: future, data: { payload: [{ id: 'P-CLOUD', title: '云端项目' }] } },
        { key: 'kc', updated_at: future, data: { payload: { raw: [{ id: 'RAW-CLOUD' }], unit: [{ id: 'KU-C' }], output: [] } } }
      ]
    });
    await sandbox.cloudPullAll();
    ok('projData 被云端覆盖', sandbox.projData[0].title === '云端项目', JSON.stringify(sandbox.projData));
    ok('kcData.raw 被云端覆盖', sandbox.kcData.raw[0].id === 'RAW-CLOUD');
    ok('kcData.unit 被云端覆盖', sandbox.kcData.unit.length === 1);
    ok('写回 localStorage', !!sandbox.localStorage.getItem('zhiyuan_projects_v1'));
    ok('提示已恢复', toasts.some(t => t.indexOf('已从云端恢复') >= 0), toasts.join('|'));
  }

  // 场景 3：本地较新 → 推送云端（不被旧数据覆盖）
  console.log('\n[场景3] 本地修改更新，云端是旧快照');
  {
    const past = new Date(Date.now() - 600000).toISOString();
    const { sandbox, pushes } = build({
      cloudRows: [{ key: 'proj', updated_at: past, data: { payload: [{ id: 'P-OLD', title: '旧云端项目' }] } }]
    });
    // 模拟本地刚改过
    sandbox.localStorage.setItem('zhiyuan_sync_meta_v1', JSON.stringify({ proj: Date.now() }));
    await sandbox.cloudPullAll();
    ok('本地数据未被旧云端覆盖', sandbox.projData[0].title === '本地项目', JSON.stringify(sandbox.projData));
    ok('本地较新的域被推送', pushes.some(p => p.key === 'proj' && p.data.payload[0].title === '本地项目'));
  }

  // 场景 4：表不存在 → 明确提示执行 SQL
  console.log('\n[场景4] 未建表（42P01）');
  {
    const { sandbox, toasts, readState } = build({ failCode: '42P01', failMsg: 'relation "public.user_state" does not exist' });
    await sandbox.cloudPullAll();
    ok('状态置为 error', readState() === 'error', readState());
    ok('提示执行 supabase-schema.sql', toasts.some(t => t.indexOf('supabase-schema.sql') >= 0), toasts.join('|'));
  }

  // 场景 5：markLocalChange 打时间戳 + 触发防抖推送
  console.log('\n[场景5] 本地变更触发自动同步');
  {
    const { sandbox, pushes, readState } = build({ cloudRows: [] });
    sandbox.kcData.raw.push({ id: 'RAW-NEW' });
    sandbox.markLocalChange('kc');
    const meta = JSON.parse(sandbox.localStorage.getItem('zhiyuan_sync_meta_v1'));
    ok('时间戳已记录', !!meta.kc);
    ok('状态先变 syncing', readState() === 'syncing', readState());
    await new Promise(r => setTimeout(r, 1500));
    ok('防抖后已推送', pushes.some(p => p.key === 'kc'), '推送数 ' + pushes.length);
    ok('推送内容含新增项', pushes.length && pushes[0].data.payload.raw.length === 2);
  }

  // 场景 6：强制从云端恢复
  console.log('\n[场景6] 手动「从云端恢复」');
  {
    const { sandbox, toasts } = build({
      cloudRows: [{ key: 'inbox', updated_at: new Date().toISOString(), data: { payload: [{ id: 99, trigger: '云端候选' }] } }]
    });
    await sandbox.syncPullForce();
    ok('inboxData 被覆盖', sandbox.inboxData[0].trigger === '云端候选', JSON.stringify(sandbox.inboxData));
    ok('提示恢复条数', toasts.some(t => t.indexOf('已从云端恢复 1') >= 0), toasts.join('|'));
  }

  // 场景 7：新设备首次打开（本地是演示种子数据），登录后不得覆盖云端真实数据
  console.log('\n[场景7] 新设备首次打开：演示种子数据不得反向覆盖云端');
  {
    const past = new Date(Date.now() - 86400000).toISOString(); // 云端是昨天写的真实数据
    const { sandbox, pushes, setSeeding } = build({
      cloudRows: [{ key: 'proj', updated_at: past, data: { payload: [{ id: 'P-REAL', title: '云端真实项目' }] } }]
    });
    // 模拟启动初始化：种子期内写入演示数据并保存
    setSeeding(true);
    sandbox.projData = [{ id: 'P-DEMO', title: '演示项目' }];
    sandbox.markLocalChange('proj');
    const meta = JSON.parse(sandbox.localStorage.getItem('zhiyuan_sync_meta_v1') || '{}');
    ok('种子期不写入时间戳', !meta.proj, JSON.stringify(meta));
    setSeeding(false);
    // 用户登录
    await sandbox.cloudPullAll();
    ok('云端真实数据覆盖了演示数据', sandbox.projData[0].title === '云端真实项目', JSON.stringify(sandbox.projData));
    ok('未把演示数据推上云端', !pushes.some(p => p.key === 'proj' && p.data.payload[0].title === '演示项目'));
  }

  console.log('\n========================================');
  console.log('  通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  console.log('========================================');
  process.exit(fail ? 1 : 0);
})();
