import { registerModule } from '../registry.js';
import { createJobsModule } from '../jobs/index.js';
import { createMemoryModule } from '../memory/index.js';
import { createMessagesModule } from '../messages/index.js';
import { createNetworkModule } from '../network/index.js';

export function registerSupportModules(deps = {}) {
  registerModule("memory", createMemoryModule({
    elements: deps.elements,
    getEntries: deps.getEntries,
    getResources: deps.getResources,
    setResources: deps.setResources,
    normalizeResources: deps.normalizeResources,
    normalizeContentSources: deps.normalizeContentSources,
    inferSource: deps.inferSource,
    safeExternalUrl: deps.safeExternalUrl,
    makeId: deps.makeId,
    undoLatestEntry: deps.undoLatestEntry,
    save: deps.saveState,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    formatDate: deps.formatDate,
    skillDefs: deps.skillDefs,
    refreshIcons: deps.refreshIcons
  }));

  registerModule("jobs", createJobsModule({
    elements: deps.elements,
    getJobs: deps.getJobs,
    normalizeJobs: deps.normalizeJobs,
    refresh: deps.refreshJobs,
    openExternalUrl: deps.openExternalUrl,
    safeExternalUrl: deps.safeExternalUrl,
    addTag: deps.addTag,
    formatDate: deps.formatJobDate,
    formatPrompt: deps.formatJobPrompt,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    refreshIcons: deps.refreshIcons
  }));

  registerModule("messages", createMessagesModule({
    elements: deps.elements,
    getSelected: deps.getSelectedMessageThread,
    setSelected: deps.setSelectedMessageThread,
    getCurrentUser: deps.getCurrentUser,
    getThreads: deps.getMessageThreads,
    loadCommunity: deps.loadCommunity,
    setCommunity: deps.setCommunity,
    saveCommunity: deps.saveCommunity,
    normalizeThread: deps.normalizeThread,
    normalizeParticipant: deps.normalizeParticipant,
    updateUnreadBadge: deps.updateUnreadBadge,
    makeId: deps.makeId,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    escapeHtml: deps.escapeHtml,
    escapeAttribute: deps.escapeAttribute,
    getInitials: deps.getInitials,
    formatDate: deps.formatDate,
    refreshIcons: deps.refreshIcons
  }));

  registerModule("network", createNetworkModule({
    elements: deps.elements,
    getContacts: deps.getContacts,
    setContacts: deps.setContacts,
    save: deps.saveState,
    normalizeContact: deps.normalizeContact,
    getStatusLabel: deps.getStatusLabel,
    getDeleteLabel: deps.getDeleteLabel,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    refreshIcons: deps.refreshIcons,
    getLanguage: deps.getLanguage
  }));
}
