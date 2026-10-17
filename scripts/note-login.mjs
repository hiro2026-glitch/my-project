// note にブラウザでログインする。ログイン状態は .auth/browser-profile に残り、note:draft がそのまま使う。
// 画面のあるPCで実行する：npm run note:login
// （note:draft もログインしていなければ画面でのログインを待つので、これを先に実行しなくてもよい）
import { launchNoteBrowser, openEditor } from './lib/browser.mjs';

const { context, page } = await launchNoteBrowser();
try {
  await openEditor(page, { headless: false });
  console.log('\nログイン状態を保存しました。次からは npm run note:draft でそのまま下書き保存できます。');
  console.log('.auth フォルダはパスワードと同じくらい大切です。人に渡したり Git に入れたりしないでください。');
} catch (e) {
  console.error(`\n${e.message}`);
  process.exitCode = 1;
} finally {
  await context.close();
}
