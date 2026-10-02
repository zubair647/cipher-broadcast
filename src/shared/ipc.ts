// Centralized IPC channel names shared by main + preload.

export const IPC = {
  // renderer -> main (invoke/handle)
  getData: 'app:getData',
  linkAccount: 'wa:linkAccount',
  cancelLink: 'wa:cancelLink',
  logout: 'wa:logout',
  refreshGroups: 'wa:refreshGroups',
  renameGroup: 'registry:renameGroup',
  saveList: 'lists:save',
  deleteList: 'lists:delete',
  sendBroadcast: 'send:broadcast',
  pickFile: 'dialog:pickFile',
  openExternal: 'shell:openExternal',

  // main -> renderer (send/on)
  onQr: 'wa:qr',
  onStatus: 'wa:status',
  onSendProgress: 'send:progress',
  onSendDone: 'send:done'
} as const
