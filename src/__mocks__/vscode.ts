/**
 * VSCode APIのモック
 * テスト環境で使用
 */

export const window = {
  showErrorMessage: (message: string) => {
    console.error('VSCode Error:', message);
  },
  showWarningMessage: (message: string) => {
    console.warn('VSCode Warning:', message);
  },
  showInformationMessage: (message: string) => {
    console.info('VSCode Info:', message);
  },
};

export const workspace = {
  getWorkspaceFolder: () => undefined,
  onDidSaveTextDocument: () => ({ dispose: () => {} }),
};

export class Uri {
  static file(path: string) {
    return { fsPath: path };
  }
}
