/**
 * Main plugin module for Obsidian AI Assistant.
 * 
 * This module sets up the plugin infrastructure including:
 * - View registration for the AI sidebar
 * - Ribbon icon and command registration
 * - Settings management
 * - View activation logic
 * 
 * @module RAGChat
 * @version 1.0.0
 * @author Travis Graham
 * 
 * @requires obsidian
 * @requires ./settings
 * @requires ./view
 */

import { Plugin, WorkspaceLeaf, requestUrl, RequestUrlParam } from 'obsidian';
import { AIPluginSettings as RAGChatPluginSettings, DEFAULT_SETTINGS, SampleSettingTab } from './settings';
import { RAGSidebarView as RAGSideBarView } from './view';

export default class RAGChat extends Plugin {
  settings: RAGChatPluginSettings;
  private sidebarView: RAGSideBarView;

  async onload() {
    await this.loadSettings();

    this.registerView('rag-sidebar', (leaf) => {
      this.sidebarView = new RAGSideBarView(leaf, this.settings);
      return this.sidebarView;
    });

    this.addRibbonIcon('bot', 'RAG Chat', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'rag-sidebar',
      name: 'RAG Chat Sidebar',
      callback: () => this.activateView()
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType('rag-sidebar');

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: 'rag-sidebar' });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.sidebarView?.updateSettings(this.settings);
  }

  onunload() {
    this.app.workspace.detachLeavesOfType('rag-sidebar');
  }
}
