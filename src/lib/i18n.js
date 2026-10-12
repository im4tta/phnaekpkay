/* Minimal i18n: English and Khmer.
   Static markup uses data-i18n / data-i18n-placeholder / data-i18n-label (aria-label) / data-i18n-title;
   scripts call t(key, vars). Khmer strings are a first draft and should be reviewed by a
   native speaker before being treated as final. */

export const STRINGS = {
  en: {
    'lang.name': 'EN',
    'lang.switch': 'Switch language to Khmer',
    'tab.all': 'All', 'tab.compare': 'Compare', 'tab.blend': 'Blend', 'tab.play': 'Play', 'tab.changes': 'Changes',
    'tab.nav': 'Views',
    'start.title': 'See what changed on the ground.',
    'start.sub': 'Compare satellite photos from different dates. No account needed.',
    'start.add': 'Add photos', 'start.map': 'From map',
    'start.sites': 'Field sites', 'start.seeAll': 'See all', 'start.continue': 'Continue',
    'start.continueMeta': '{n} photos · saved on this device',
    'start.privacy': 'Your photos and keys stay on this device.',
    'start.noSites': 'Field sites could not be loaded.',
    'site.photos': '{n} photos',
    'picker.title': 'Pick two photos', 'picker.swap': 'Swap', 'picker.add': 'Add photo',
    'picker.hide': 'Hide', 'picker.show': 'Choose photos',
    'picker.a.slider': 'Before', 'picker.b.slider': 'After',
    'picker.a.overlay': 'Base', 'picker.b.overlay': 'On top',
    'picker.a.change': 'Before', 'picker.b.change': 'After',
    'more.options': 'More options',
    'grid.columns': 'Columns',
    'overlay.amount': 'Show more of the top photo',
    'overlay.blink': 'Blink to spot changes',
    'seq.play': 'Play', 'seq.pause': 'Pause', 'seq.speed': 'Seconds per photo', 'seq.fade': 'Smooth fade',
    'change.area': 'of the area changed', 'change.spots': 'spots', 'change.confidence': 'confidence',
    'change.sensitivity': 'Sensitivity', 'change.low': 'Only big changes', 'change.high': 'Every small change',
    'change.low.word': 'Low', 'change.mid.word': 'Medium', 'change.high.word': 'High',
    'change.method': 'Compare by', 'change.rgb': 'Colour', 'change.luma': 'Brightness', 'change.ndvi': 'Vegetation',
    'change.minSize': 'Ignore spots smaller than',
    'change.high.label': 'High', 'change.review.label': 'Check by eye', 'change.low.label': 'Low',
    'change.needTwo': 'Add at least two photos of the same place to see what changed.',
    'change.pickDifferent': 'Pick two different photos.',
    'actions.exportPng': 'Save image', 'actions.share': 'Share', 'actions.report': 'Report', 'actions.saveProject': 'Save project',
    'actions.loadProject': 'Open project', 'actions.sites': 'Field sites', 'actions.video': 'Record video', 'actions.enhance': 'Enhance', 'actions.fullscreen': 'Full screen', 'actions.exitFullscreen': 'Exit full screen',
    'actions.more': 'More', 'actions.menu': 'Menu', 'actions.theme': 'Light or dark theme', 'actions.controls': 'Photos and settings',
    'add.title': 'Add photos', 'add.photos': 'Photos', 'add.satellite': 'Satellite', 'add.paste': 'Paste',
    'add.drop.desktop': 'Drop photos here, or click to choose', 'add.drop.mobile': 'Tap to choose photos',
    'add.drop.hint': 'PNG, JPG or WebP',
    'add.pasteHint': 'Copy an image anywhere, then paste it here.', 'add.pasteBtn': 'Paste image',
    'add.pasteEmpty': 'No image found on the clipboard.',
    'frames.title': 'Photos in this project', 'frames.empty': 'No photos yet.',
    'frames.removed': 'Photo removed.', 'undo': 'Undo',
    'notes.title': 'Notes', 'notes.caption': 'Caption', 'notes.notes': 'Notes',
    'toast.saved': 'Project saved to your device.', 'toast.loaded': 'Project opened.',
    'toast.loadFail': 'Could not open that project file.', 'toast.saveFail': 'Could not save the project.',
    'toast.captured': 'Captured and added to your photos.', 'toast.copied': 'Link copied.',
    'toast.shared': 'Image ready.', 'toast.shareFail': 'Sharing is not available here. The image was saved instead.',
    'update.ready': 'Update ready', 'update.reload': 'Reload',
    'toast.skipped': '{n} file(s) were skipped (not a supported image, or over 60 MB).',
    'install.title': 'Install Phnaek Pkay', 'install.sub': 'Opens full-screen and works offline.',
    'install.step1': 'Tap Share in Safari', 'install.step2': 'Choose Add to Home Screen',
    'install.notNow': 'Not now', 'install.gotIt': 'Got it', 'install.button': 'Install',
    'close': 'Close',
  },
  km: {
    'lang.name': 'ខ្មែរ',
    'lang.switch': 'ប្តូរភាសាទៅអង់គ្លេស',
    'tab.all': 'ទាំងអស់', 'tab.compare': 'ប្រៀបធៀប', 'tab.blend': 'លាយបញ្ចូល', 'tab.play': 'ចាក់', 'tab.changes': 'ការផ្លាស់ប្តូរ',
    'tab.nav': 'ទិដ្ឋភាព',
    'start.title': 'មើលអ្វីដែលបានផ្លាស់ប្តូរនៅលើដី។',
    'start.sub': 'ប្រៀបធៀបរូបថតផ្កាយរណបពីកាលបរិច្ឆេទផ្សេងៗ។ មិនចាំបាច់មានគណនីទេ។',
    'start.add': 'បន្ថែមរូបថត', 'start.map': 'ពីផែនទី',
    'start.sites': 'ទីតាំងស្រាវជ្រាវ', 'start.seeAll': 'មើលទាំងអស់', 'start.continue': 'បន្ត',
    'start.continueMeta': 'រូបថត {n} · រក្សាទុកក្នុងឧបករណ៍នេះ',
    'start.privacy': 'រូបថត និងកូដរបស់អ្នកស្ថិតនៅក្នុងឧបករណ៍នេះ។',
    'start.noSites': 'មិនអាចផ្ទុកទីតាំងស្រាវជ្រាវបានទេ។',
    'site.photos': 'រូបថត {n}',
    'picker.title': 'ជ្រើសរើសរូបថតពីរ', 'picker.swap': 'ប្តូរ', 'picker.add': 'បន្ថែមរូបថត',
    'picker.hide': 'លាក់', 'picker.show': 'ជ្រើសរើសរូបថត',
    'picker.a.slider': 'មុន', 'picker.b.slider': 'ក្រោយ',
    'picker.a.overlay': 'ខាងក្រោម', 'picker.b.overlay': 'ខាងលើ',
    'picker.a.change': 'មុន', 'picker.b.change': 'ក្រោយ',
    'more.options': 'ជម្រើសបន្ថែម',
    'grid.columns': 'ជួរឈរ',
    'overlay.amount': 'បង្ហាញរូបថតខាងលើច្រើនជាង',
    'overlay.blink': 'បញ្ចេញពន្លឺដើម្បីរកការផ្លាស់ប្តូរ',
    'seq.play': 'ចាក់', 'seq.pause': 'ផ្អាក', 'seq.speed': 'វិនាទីក្នុងមួយរូបថត', 'seq.fade': 'ប្តូរយ៉ាងរលូន',
    'change.area': 'នៃតំបន់បានផ្លាស់ប្តូរ', 'change.spots': 'កន្លែង', 'change.confidence': 'ភាពជឿជាក់',
    'change.sensitivity': 'ភាពប្រកាន់អារម្មណ៍', 'change.low': 'ការផ្លាស់ប្តូរធំៗប៉ុណ្ណោះ', 'change.high': 'គ្រប់ការផ្លាស់ប្តូរតូចៗ',
    'change.low.word': 'ទាប', 'change.mid.word': 'មធ្យម', 'change.high.word': 'ខ្ពស់',
    'change.method': 'ប្រៀបធៀបតាម', 'change.rgb': 'ពណ៌', 'change.luma': 'ពន្លឺ', 'change.ndvi': 'រុក្ខជាតិ',
    'change.minSize': 'មិនអើពើកន្លែងតូចជាង',
    'change.high.label': 'ខ្ពស់', 'change.review.label': 'ពិនិត្យដោយភ្នែក', 'change.low.label': 'ទាប',
    'change.needTwo': 'បន្ថែមរូបថតយ៉ាងតិចពីរនៃទីតាំងតែមួយ ដើម្បីមើលការផ្លាស់ប្តូរ។',
    'change.pickDifferent': 'សូមជ្រើសរើសរូបថតពីរផ្សេងគ្នា។',
    'actions.exportPng': 'រក្សាទុករូបភាព', 'actions.share': 'ចែករំលែក', 'actions.report': 'របាយការណ៍', 'actions.saveProject': 'រក្សាទុកគម្រោង',
    'actions.loadProject': 'បើកគម្រោង', 'actions.sites': 'ទីតាំងស្រាវជ្រាវ', 'actions.video': 'ថតវីដេអូ', 'actions.enhance': 'ធ្វើឱ្យកាន់តែច្បាស់', 'actions.fullscreen': 'ពេញអេក្រង់', 'actions.exitFullscreen': 'ចាកចេញពីពេញអេក្រង់',
    'actions.more': 'ច្រើនទៀត', 'actions.menu': 'ម៉ឺនុយ', 'actions.theme': 'ពណ៌ស្រាល ឬងងឹត', 'actions.controls': 'រូបថត និងការកំណត់',
    'add.title': 'បន្ថែមរូបថត', 'add.photos': 'រូបថត', 'add.satellite': 'ផ្កាយរណប', 'add.paste': 'បិទភ្ជាប់',
    'add.drop.desktop': 'ទម្លាក់រូបថតនៅទីនេះ ឬចុចដើម្បីជ្រើសរើស', 'add.drop.mobile': 'ចុចដើម្បីជ្រើសរើសរូបថត',
    'add.drop.hint': 'PNG, JPG ឬ WebP',
    'add.pasteHint': 'ចម្លងរូបភាពពីកន្លែងណាមួយ រួចបិទភ្ជាប់នៅទីនេះ។', 'add.pasteBtn': 'បិទភ្ជាប់រូបភាព',
    'add.pasteEmpty': 'រកមិនឃើញរូបភាពនៅក្នុងឃ្លីបបត។',
    'frames.title': 'រូបថតក្នុងគម្រោងនេះ', 'frames.empty': 'មិនទាន់មានរូបថតទេ។',
    'frames.removed': 'បានលុបរូបថត។', 'undo': 'មិនធ្វើវិញ',
    'notes.title': 'កំណត់ចំណាំ', 'notes.caption': 'ចំណងជើង', 'notes.notes': 'កំណត់ចំណាំ',
    'toast.saved': 'បានរក្សាទុកគម្រោងក្នុងឧបករណ៍របស់អ្នក។', 'toast.loaded': 'បានបើកគម្រោង។',
    'toast.loadFail': 'មិនអាចបើកឯកសារគម្រោងនោះបានទេ។', 'toast.saveFail': 'មិនអាចរក្សាទុកគម្រោងបានទេ។',
    'toast.captured': 'បានថត ហើយបន្ថែមទៅក្នុងរូបថតរបស់អ្នក។', 'toast.copied': 'បានចម្លងតំណ។',
    'toast.shared': 'រូបភាពរួចរាល់។', 'toast.shareFail': 'ការចែករំលែកមិនមានទេ។ រូបភាពត្រូវបានរក្សាទុកជំនួស។',
    'update.ready': 'មានកំណែថ្មី', 'update.reload': 'ផ្ទុកឡើងវិញ',
    'toast.skipped': 'ឯកសារ {n} ត្រូវបានរំលង (មិនមែនជារូបភាពដែលគាំទ្រ ឬធំជាង 60 MB)។',
    'install.title': 'ដំឡើង Phnaek Pkay', 'install.sub': 'បើកពេញអេក្រង់ ហើយដំណើរការដោយគ្មានអ៊ីនធឺណិត។',
    'install.step1': 'ចុច Share ក្នុង Safari', 'install.step2': 'ជ្រើសរើស Add to Home Screen',
    'install.notNow': 'មិនទាន់', 'install.gotIt': 'យល់ហើយ', 'install.button': 'ដំឡើង',
    'close': 'បិទ',
  },
};

export const LANGS = Object.keys(STRINGS);
const STORAGE_KEY = 'phnaek-pkay-lang';
let current = 'en';

export function getLang() { return current; }

export function t(key, vars) {
  const text = (STRINGS[current] && STRINGS[current][key]) ?? STRINGS.en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`)) : text;
}

/** Apply translations to every marked element under `root`. */
export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  // data-i18n-placeholder / data-i18n-label (sets aria-label) / data-i18n-title
  for (const [data, attr] of [['placeholder', 'placeholder'], ['label', 'aria-label'], ['title', 'title']]) {
    for (const el of root.querySelectorAll(`[data-i18n-${data}]`)) el.setAttribute(attr, t(el.getAttribute(`data-i18n-${data}`)));
  }
}

export function detectLang(storage = globalThis.localStorage, navLang = globalThis.navigator?.language) {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved && LANGS.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return String(navLang || '').toLowerCase().startsWith('km') ? 'km' : 'en';
}

export function setLang(lang, { persist = true } = {}) {
  current = LANGS.includes(lang) ? lang : 'en';
  document.documentElement.lang = current;
  if (persist) { try { localStorage.setItem(STORAGE_KEY, current); } catch { /* ignore */ } }
  applyI18n();
  document.dispatchEvent(new CustomEvent('langchange', { detail: current }));
  return current;
}
