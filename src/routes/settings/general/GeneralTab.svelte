<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { TogglePill, ToggleSwitch } from '$lib/components/ui/toggle-pill';
	import CronEditor from '$lib/components/cron-editor.svelte';
	import TimezoneSelector from '$lib/components/TimezoneSelector.svelte';
	import { Eye, Bell, Database, Calendar, ShieldCheck, FileText, AlertTriangle, HelpCircle, Globe, Activity, Clock, Info, Save, RotateCcw, LayoutDashboard, Tags, Archive, ChevronRight, ChevronDown, Compass, Layers } from 'lucide-svelte';
	import { STACK_LOG_OPERATIONS, type StackLogOperation } from '$lib/utils/stack-log-operations';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import { appSettings, type DateFormat, type DownloadFormat, type EventCollectionMode, type LabelFilterMode } from '$lib/stores/settings';
	import { canAccess, authStore } from '$lib/stores/auth';
	import { toast } from 'svelte-sonner';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';
	import NavigationSelector from '$lib/components/NavigationSelector.svelte';
	import AnimateIconsToggle from '$lib/components/AnimateIconsToggle.svelte';
	import IndentGuidesToggle from '$lib/components/IndentGuidesToggle.svelte';
	import EditorThemeSelector from '$lib/components/EditorThemeSelector.svelte';
	import ColoredActionsToggle from '$lib/components/ColoredActionsToggle.svelte';
	import SemverCheckConfig from '$lib/components/SemverCheckConfig.svelte';
	import { onMount } from 'svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

	// General settings state - these derive from the store
	let confirmDestructive = $derived($appSettings.confirmDestructive);
	let showStoppedContainers = $derived($appSettings.showStoppedContainers);
	let highlightUpdates = $derived($appSettings.highlightUpdates);
	let compactPorts = $derived($appSettings.compactPorts);
	let showExposedPorts = $derived($appSettings.showExposedPorts);
	let showGitCommitHash = $derived($appSettings.showGitCommitHash);
	let honorProxyLabels = $derived($appSettings.honorProxyLabels);
	let showImageChangelogLinks = $derived($appSettings.showImageChangelogLinks);
	let useSelfhstIcons = $derived($appSettings.useSelfhstIcons);
	let showWhatsNew = $derived($appSettings.showWhatsNew);
	let timeFormat = $derived($appSettings.timeFormat);
	let dateFormat = $derived($appSettings.dateFormat);
	let downloadFormat = $derived($appSettings.downloadFormat);
	let defaultGrypeArgs = $derived($appSettings.defaultGrypeArgs);
	let defaultTrivyArgs = $derived($appSettings.defaultTrivyArgs);
	let defaultGrypeImage = $derived($appSettings.defaultGrypeImage);
	let defaultTrivyImage = $derived($appSettings.defaultTrivyImage);
	let defaultScannerNetworkMode = $derived($appSettings.defaultScannerNetworkMode);
	let defaultScannerDns = $derived($appSettings.defaultScannerDns);
	let stackLogOperations = $derived($appSettings.stackLogOperations);

	function toggleStackLogOperation(op: StackLogOperation, show: boolean) {
		const next = show
			? [...stackLogOperations, op]
			: stackLogOperations.filter((o) => o !== op);
		appSettings.setStackLogOperations(next);
	}
	let showAdvancedScannerSettings = $state(false);
	let defaultComposeTemplate = $derived($appSettings.defaultComposeTemplate);
	let labelFilterMode = $derived($appSettings.labelFilterMode);
	let composeTemplateWIP = $state('');
	let composeTemplateInitialized = false;

	$effect(() => {
		if (!composeTemplateInitialized && defaultComposeTemplate !== undefined) {
			composeTemplateWIP = defaultComposeTemplate;
			composeTemplateInitialized = true;
		}
	});

	const builtinComposeTemplate = `version: "3.8"

services:
  app:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      - APP_ENV=\${APP_ENV:-production}
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped

# Add more services as needed
# networks:
#   default:
#     driver: bridge
`;

	function saveComposeTemplate() {
		appSettings.setDefaultComposeTemplate(composeTemplateWIP);
		toast.success('撰写模板已更新');
	}

	function revertComposeTemplate() {
		composeTemplateWIP = builtinComposeTemplate;
		toast.info('模板已还原为默认值');
	}
	let scheduleRetentionDays = $derived($appSettings.scheduleRetentionDays);
	let eventRetentionDays = $derived($appSettings.eventRetentionDays);
	let scheduleCleanupCron = $derived($appSettings.scheduleCleanupCron);
	let eventCleanupCron = $derived($appSettings.eventCleanupCron);
	let scheduleCleanupEnabled = $derived($appSettings.scheduleCleanupEnabled);
	let eventCleanupEnabled = $derived($appSettings.eventCleanupEnabled);
	let scannerCleanupCron = $derived($appSettings.scannerCleanupCron);
	let scannerCleanupEnabled = $derived($appSettings.scannerCleanupEnabled);
	let deployLogReconcileCron = $derived($appSettings.deployLogReconcileCron);
	let deployLogReconcileEnabled = $derived($appSettings.deployLogReconcileEnabled);
	let logMaxLines = $derived($appSettings.logMaxLines);
	let formatLogTimestamps = $derived($appSettings.formatLogTimestamps);
	let defaultTimezone = $derived($appSettings.defaultTimezone);
	let eventCollectionMode = $derived($appSettings.eventCollectionMode);
	let eventPollInterval = $derived($appSettings.eventPollInterval);
	let metricsCollectionInterval = $derived($appSettings.metricsCollectionInterval);
	let defaultBackupImage = $derived($appSettings.defaultBackupImage);

	let clearingCache = $state(false);

	async function clearScannerCache() {
		clearingCache = true;
		try {
			const res = await fetch('/api/settings/scanner/cache', { method: 'DELETE' });
			const data = await res.json();
			if (res.ok && data.success) {
				const total = (data.removedVolumes?.length || 0) + (data.removedDirs?.length || 0);
				if (total > 0) {
					toast.success(`Scanner cache cleared (${total} items removed)`);
				} else {
					toast.info('扫描仪缓存已为空。');
				}
			} else {
				toast.error(data.error || '清除扫描仪缓存失败');
			}
		} catch {
			toast.error('清除扫描仪缓存失败');
		} finally {
			clearingCache = false;
		}
	}

	const dateFormatOptions: { value: DateFormat; label: string; example: string }[] = [
		{ value: '日.月.年', label: '日.月.年', example: '31.12.2024' },
		{ value: '日/月/年', label: '日/月/年', example: '31/12/2024' },
		{ value: '月/日/年', label: '月/日/年', example: '12/31/2024' },
		{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' }
	];

	const downloadFormatOptions: { value: DownloadFormat; label: string; description: string }[] = [
		{ value: 'tar', label: 'tar', description: '未压缩存档' },
		{ value: 'tar.gz', label: 'tar.gz', description: 'Gzip压缩存档' },
		{ value: 'raw', label: '无存档', description: '单个文件，原始字节' }
	];

	const downloadFormatLabel: Record<DownloadFormat, string> = {
		tar: 'tar',
		'tar.gz': 'tar.gz',
		raw: '无存档'
	};

	function handleScheduleRetentionChange(e: Event) {
		const value = Math.max(1, Math.min(365, parseInt((e.target as HTMLInputElement).value) || 30));
		appSettings.setScheduleRetentionDays(value);
		toast.success('计划保留更新');
	}

	function handleEventRetentionChange(e: Event) {
		const value = Math.max(1, Math.min(365, parseInt((e.target as HTMLInputElement).value) || 30));
		appSettings.setEventRetentionDays(value);
		toast.success('事件保留更新');
	}

	function handleScheduleCleanupCronChange(cron: string) {
		appSettings.setScheduleCleanupCron(cron);
		toast.success('计划清理 cron 已更新');
	}

	function handleEventCleanupCronChange(cron: string) {
		appSettings.setEventCleanupCron(cron);
		toast.success('事件清理 cron 已更新');
	}

	function handleScheduleCleanupEnabledChange() {
		const newState = !scheduleCleanupEnabled;
		appSettings.setScheduleCleanupEnabled(newState);
		toast.success(newState ? 'Schedule cleanup enabled' : 'Schedule cleanup disabled');
	}

	function handleEventCleanupEnabledChange() {
		const newState = !eventCleanupEnabled;
		appSettings.setEventCleanupEnabled(newState);
		toast.success(newState ? 'Event cleanup enabled' : 'Event cleanup disabled');
	}

	function handleScannerCleanupCronChange(cron: string) {
		appSettings.setScannerCleanupCron(cron);
		toast.success('扫描仪清理 cron 已更新');
	}

	function handleScannerCleanupEnabledChange() {
		const newState = !scannerCleanupEnabled;
		appSettings.setScannerCleanupEnabled(newState);
		toast.success(newState ? 'Scanner cleanup enabled' : 'Scanner cleanup disabled');
	}

	function handleDeployLogReconcileCronChange(cron: string) {
		appSettings.setDeployLogReconcileCron(cron);
		toast.success('部署日志协调 cron 已更新');
	}

	function handleDeployLogReconcileEnabledChange() {
		const newState = !deployLogReconcileEnabled;
		appSettings.setDeployLogReconcileEnabled(newState);
		toast.success(newState ? 'Deploy log reconcile enabled' : 'Deploy log reconcile disabled');
	}

	function handleGrypeImageBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value && value !== defaultGrypeImage) {
			appSettings.setDefaultGrypeImage(value);
			toast.success('Grype 镜像已更新');
		}
	}

	function handleTrivyImageBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value && value !== defaultTrivyImage) {
			appSettings.setDefaultTrivyImage(value);
			toast.success('Trivy 镜像已更新');
		}
	}

	function handleGrypeArgsBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value !== defaultGrypeArgs) {
			appSettings.setDefaultGrypeArgs(value);
			toast.success('Grype 默认参数已更新');
		}
	}

	function handleTrivyArgsBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value !== defaultTrivyArgs) {
			appSettings.setDefaultTrivyArgs(value);
			toast.success('Trivy 默认参数已更新');
		}
	}

	function handleScannerNetworkModeChange(value: string) {
		const trimmed = (value ?? '').trim();
		if (trimmed !== defaultScannerNetworkMode) {
			appSettings.setDefaultScannerNetworkMode(trimmed);
			toast.success(trimmed ? `扫描仪网络模式设置为 ${trimmed}` : 'Scanner network mode cleared');
		}
	}

	function handleScannerDnsBlur(e: Event) {
		const raw = (e.target as HTMLInputElement).value.trim();
		const cleaned = raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const sameAsCurrent =
			cleaned.length === defaultScannerDns.length &&
			cleaned.every((v, i) => v === defaultScannerDns[i]);
		if (!sameAsCurrent) {
			appSettings.setDefaultScannerDns(cleaned);
			toast.success(cleaned.length ? `扫描器 DNS 设置为 ${cleaned.join(', ')}` : 'Scanner DNS cleared');
		}
	}

	// Anything above 2K starts feeling laggy in browsers without virtualized rendering.
	const logMaxLinesOptions = [
		{ value: '500', label: '500 lines' },
		{ value: '1000', label: '1,000 lines' },
		{ value: '2000', label: '2,000 lines' }
	];

	function handleLogMaxLinesChange(value: string | undefined) {
		const n = parseInt(value ?? '');
		if (!Number.isFinite(n) || n <= 0) return;
		appSettings.setLogMaxLines(Math.min(2000, Math.max(100, n)));
		toast.success('日志缓冲区大小已更新');
	}

	function handleEventCollectionModeChange(value: string | undefined) {
		if (value === 'stream' || value === 'poll') {
			appSettings.setEventCollectionMode(value);
			toast.success(`事件收集模式：${value}`);
		}
	}

	function handleEventPollIntervalChange(selected: { value: number } | undefined) {
		if (selected?.value) {
			appSettings.setEventPollInterval(selected.value);
			toast.success(`事件轮询间隔：${selected.value / 1000}秒`);
		}
	}

	function handleMetricsIntervalChange(selected: { value: number } | undefined) {
		if (selected?.value) {
			appSettings.setMetricsCollectionInterval(selected.value);
			toast.success(`指标间隔：${selected.value / 1000}秒`);
		}
	}

	function handleBackupImageBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value && value !== defaultBackupImage) {
			appSettings.setDefaultBackupImage(value);
			toast.success('备份映像已更新');
		}
	}

	// Global newer-version-tag (semver) detection - one setting every update check
	// (scheduled and manual) reads.
	let semverEnabled = $state(false);
	let semverMaxBump = $state<'patch' | 'minor' | 'major'>('major');
	let semverMatchFlavor = $state(true);
	let semverIncludePrerelease = $state(false);
	let semverLoaded = $state(false);

	// The global theme defaults (what a new user starts with). With auth on the theme
	// toggles here edit these, not the admin's own profile. Rendering waits on
	// globalThemeLoaded: until the fetch fills these, a toggle handed globalValue=undefined
	// would fall back to the admin's personal store value and show it.
	let globalColoredActions = $state<boolean | undefined>(undefined);
	let globalAnimateIcons = $state<boolean | undefined>(undefined);
	let globalIndentGuides = $state<boolean | undefined>(undefined);
	let globalThemeLoaded = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/settings/semver');
			if (res.ok) {
				const c = await res.json();
				semverEnabled = c.enabled ?? false;
				semverMaxBump = c.maxBump ?? 'major';
				semverMatchFlavor = c.matchFlavor ?? true;
				semverIncludePrerelease = c.includePrerelease ?? false;
			}
		} catch { /* keep defaults */ }
		semverLoaded = true;

		try {
			const res = await fetch('/api/settings/general');
			if (res.ok) {
				const g = await res.json();
				globalColoredActions = !!g.coloredActionButtons;
				globalAnimateIcons = g.animateIcons ?? true;
				globalIndentGuides = !!g.editorIndentGuides;
			}
		} catch { /* toggles fall back to store when global value is unknown */ }
		globalThemeLoaded = true;
	});

	async function saveSemverConfig() {
		try {
			await fetch('/api/settings/semver', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					enabled: semverEnabled,
					maxBump: semverMaxBump,
					matchFlavor: semverMatchFlavor,
					includePrerelease: semverIncludePrerelease
				})
			});
		} catch {
			toast.error('保存版本检查设置失败');
		}
	}

	// Persist on any change once the initial load is done (skip the load itself).
	$effect(() => {
		semverEnabled; semverMaxBump; semverMatchFlavor; semverIncludePrerelease;
		if (semverLoaded) saveSemverConfig();
	});
</script>

<div class="flex-1 min-h-0 overflow-y-auto">
	<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
		<!-- Left column -->
		<div class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Eye class="w-4 h-4" />外貌<Tooltip.Provider delayDuration={100}>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<HelpCircle class="w-4 h-4 text-muted-foreground cursor-help" />
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content side="right" sideOffset={8} class="!w-80">
										{#if $authStore.authEnabled}
											These settings apply to the login page and as defaults. Personal preferences can be configured in your profile.
										{:else}
											Theme and font settings are global when authentication is disabled.
										{/if}
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>
						</Tooltip.Provider>
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						<!-- Left column -->
						<div class="space-y-4">
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>停运的容器</Label>
									<TogglePill
										checked={showStoppedContainers}
										onchange={(checked) => {
											appSettings.setShowStoppedContainers(checked);
											toast.success(checked ? 'Stopped containers shown' : 'Stopped containers hidden');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">在列表中显示已停止和已退出的容器</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>突出显示可用更新</Label>
									<TogglePill
										checked={highlightUpdates}
										onchange={(checked) => {
											appSettings.setHighlightUpdates(checked);
											toast.success(checked ? 'Update highlighting enabled' : 'Update highlighting disabled');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">当有更新可用时，以琥珀色高亮显示容器行。</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>显示更新日志链接</Label>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="w-96 max-w-[90vw]">
											<p>在有可用更新的行中，在镜像名称旁边显示发行说明链接。该链接由镜像解析而来。<code>org.opencontainers.image.source</code> label, from the <code>ghcr.io</code> registry path, or from an explicit <code>dockhand.changelog.url</code> label override.</p>
										</Tooltip.Content>
									</Tooltip.Root>
									<TogglePill
										checked={showImageChangelogLinks}
										onchange={(checked) => {
											appSettings.setShowImageChangelogLinks(checked);
											toast.success(checked ? 'Changelog links shown' : 'Changelog links hidden');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">在有可用更新的镜像旁边显示发行说明图标</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>使用 selfh.st 图标</Label>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="w-96 max-w-[90vw]">
											<p>显示应用图标<a href="https://selfh.st" target="_blank" rel="noopener" class="underline">selfh.st</a> as container icons, matched automatically from the image name. Logos are fetched once and cached locally, so your browser never contacts an external CDN. Off by default. Logos are CC BY 4.0; product names and trademarks are the property of their respective owners and are shown for identification only, without implying endorsement.</p>
										</Tooltip.Content>
									</Tooltip.Root>
									<TogglePill
										checked={useSelfhstIcons}
										onchange={(checked) => {
											appSettings.setUseSelfhstIcons(checked);
											toast.success(checked ? 'selfh.st icons enabled' : 'selfh.st icons disabled');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">容器上的自动应用图标，从 selfh.st 获取并缓存于本地</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>显示“最新动态”</Label>
									<TogglePill
										checked={showWhatsNew}
										onchange={(checked) => {
											appSettings.setShowWhatsNew(checked);
											toast.success(checked ? "What's New popup enabled" : "What's New popup disabled");
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">升级到新版本后显示“新增功能”弹出窗口</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>紧凑型端口显示器</Label>
									<TogglePill
										checked={compactPorts}
										onchange={(checked) => {
											appSettings.setCompactPorts(checked);
											toast.success(checked ? 'Compact port display enabled' : 'Showing all ports');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">显示第一个端口（计数为 +N），而不是显示所有端口。</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>显示暴露的端口</Label>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="w-96 max-w-[90vw]">
											<p>显示未发布到主机的内部容器端口（来自 EXPOSE 指令）。这些端口在容器列表中以琥珀色标记显示，以区别于已发布的端口映射。</p>
										</Tooltip.Content>
									</Tooltip.Root>
									<TogglePill
										checked={showExposedPorts}
										onchange={(checked) => {
											appSettings.setShowExposedPorts(checked);
											toast.success(checked ? 'Showing exposed ports in container list' : 'Exposed ports hidden from container list');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">在容器列表网格中显示内部容器端口</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>显示 Git 提交哈希值</Label>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="w-96 max-w-[90vw]">
											<p>在编排列表源列的 Git 徽章上显示已部署的简短提交哈希值，并在工具提示中显示完整哈希值、仓库 URL 和分支。</p>
										</Tooltip.Content>
									</Tooltip.Root>
									<TogglePill
										checked={showGitCommitHash}
										onchange={(checked) => {
											appSettings.setShowGitCommitHash(checked);
											toast.success(checked ? 'Showing git commit hash on stack badges' : 'Git commit hash hidden');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">在编排列表中的 Git 源代码徽章上显示已部署提交的哈希值</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>荣誉 Traefik/Pangolin/Caddy 标签</Label>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="w-96 max-w-[90vw]">
											<p>解析<code>traefik.http.routers.&lt;name&gt;.rule</code>, <code>pangolin.public-resources.&lt;name&gt;.full-domain</code>, <code>pangolin.private-resources.&lt;name&gt;.full-domain</code>, and caddy-docker-proxy <code>caddy</code>/<code>caddy_&lt;n&gt;</code> site-address labels, and surface the resulting URLs as clickable pills next to ports. When off, only explicit <code>dockhand.url</code> labels are shown.</p>
										</Tooltip.Content>
									</Tooltip.Root>
									<TogglePill
										checked={honorProxyLabels}
										onchange={(checked) => {
											appSettings.setHonorProxyLabels(checked);
											toast.success(checked ? 'Proxy labels honored' : 'Proxy labels ignored');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">显示从 Traefik 和 Pangolin 标签推断出的 URL，以及 dockhand.url</p>
							</div>
						</div>
						<!-- Right column: Theme settings (always shown, with hint when auth enabled) -->
						<div class="space-y-4">
							<ThemeSelector />
							<!-- With auth on the toggles edit the GLOBAL defaults, so they wait for
							     those to load; binding globalValue=undefined first would show the
							     admin's own profile value. With auth off the store IS the global
							     value, so they render immediately. -->
							{#if !$authStore.authEnabled || globalThemeLoaded}
								<ColoredActionsToggle globalValue={$authStore.authEnabled ? globalColoredActions : undefined} />
								<AnimateIconsToggle globalValue={$authStore.authEnabled ? globalAnimateIcons : undefined} />
								<IndentGuidesToggle globalValue={$authStore.authEnabled ? globalIndentGuides : undefined} />
							{/if}
							{#if $authStore.authEnabled}
								<div class="text-xs text-muted-foreground flex items-start gap-1.5 mt-2 p-2 bg-muted/50 rounded-md">
									<HelpCircle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
									<div>
										<p>这些是<strong>defaults for new users</strong>它们不会改变你自己的观点。要自定义如何<em>you</em> see the app, use the theme settings in your <a href="/profile" class="text-primary hover:underline">profile</a>.</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				<!-- Time + date format span the full card width, two columns, so they get
				     room instead of crowding inside the narrow settings column. -->
				<div class="mt-4 border-t pt-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						<div class="space-y-1">
							<div class="flex items-center gap-3">
								<Label>时间格式</Label>
								<ToggleSwitch
									value={timeFormat}
									leftValue="24h"
									rightValue="12h"
									onchange={(newFormat) => {
										appSettings.setTimeFormat(newFormat as '12h' | '24h');
										toast.success(`Time format set to ${newFormat === '12h' ? '12-hour (AM/PM)' : '24-hour'}`);
									}}
									disabled={!$canAccess('settings', 'edit')}
								/>
							</div>
							<p class="text-xs text-muted-foreground">Clock display used throughout the app</p>
						</div>
						<div class="space-y-1">
							<div class="flex items-center gap-3">
								<Label>日期格式</Label>
								<Select.Root
									type="single"
									value={dateFormat}
									onValueChange={(value) => {
										if (value) {
											appSettings.setDateFormat(value as DateFormat);
											toast.success(`Date format set to ${value}`);
										}
									}}
									disabled={!$canAccess('settings', 'edit')}
								>
									<Select.Trigger class="w-[180px]">
										<Calendar class="w-4 h-4 mr-2" />
										<span>{dateFormat}</span>
									</Select.Trigger>
									<Select.Content>
										{#each dateFormatOptions as option}
											<Select.Item value={option.value}>
												<div class="flex items-center justify-between w-full gap-4">
													<span>{option.label}</span>
													<span class="text-xs text-muted-foreground">{option.example}</span>
												</div>
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<p class="text-xs text-muted-foreground">Date display used throughout the app</p>
						</div>
					</div>
				</div>
				<!-- Editor theme spans the full card width so the live preview isn't cramped. -->
				{#if !$authStore.authEnabled || globalThemeLoaded}
					<div class="mt-4 border-t pt-4">
						<EditorThemeSelector />
					</div>
				{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Compass class="w-4 h-4" />导航</Card.Title>
				</Card.Header>
				<Card.Content>
					<NavigationSelector />
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Globe class="w-4 h-4" />日程安排</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label>默认时区</Label>
						<TimezoneSelector
							value={defaultTimezone}
							onchange={(value) => {
								appSettings.setDefaultTimezone(value);
								toast.success(`Default timezone set to ${value}`);
							}}
							class="w-[320px]"
						/>
						<p class="text-xs text-muted-foreground">新环境的默认时区。用于计划任务，例如自动更新。</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Bell class="w-4 h-4" />确认</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-1">
						<div class="flex items-center gap-3">
							<Label>确认破坏行为</Label>
							<TogglePill
								checked={confirmDestructive}
								onchange={(checked) => {
									appSettings.setConfirmDestructive(checked);
									toast.success(checked ? 'Confirmations enabled' : 'Confirmations disabled');
								}}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">删除资源前显示确认对话框</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<FileText class="w-4 h-4" />日志和文件</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="log-max-lines">日志缓冲区大小</Label>
								<Select.Root
									type="single"
									value={String(logMaxLines)}
									onValueChange={handleLogMaxLinesChange}
									disabled={!$canAccess('settings', 'edit')}
								>
									<Select.Trigger id="log-max-lines" class="w-48">
										{logMaxLines.toLocaleString()} lines
									</Select.Trigger>
									<Select.Content>
										{#each logMaxLinesOptions as opt}
											<Select.Item value={opt.value}>{opt.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<p class="text-xs text-muted-foreground">每个容器面板保留的最大日志行数。超过限制后，较旧的日志行将被删除。</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>下载格式</Label>
									<Select.Root
										type="single"
										value={downloadFormat}
										onValueChange={(value) => {
											if (value) {
												appSettings.setDownloadFormat(value as DownloadFormat);
												toast.success(`Download format set to ${downloadFormatLabel[value as DownloadFormat]}`);
											}
										}}
										disabled={!$canAccess('settings', 'edit')}
									>
										<Select.Trigger class="w-[180px]">
											<FileText class="w-4 h-4 mr-2" />
											<span>{downloadFormatLabel[downloadFormat]}</span>
										</Select.Trigger>
										<Select.Content>
											{#each downloadFormatOptions as option}
												<Select.Item value={option.value}>
													<div class="flex items-center justify-between w-full gap-4">
														<span>{option.label}</span>
														<span class="text-xs text-muted-foreground">{option.description}</span>
													</div>
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<p class="text-xs text-muted-foreground">从容器或卷下载文件时的格式。“No archive”选项会输出单个文件的原始字节；目录仍会以 tar 格式下载。</p>
							</div>
						</div>
						<div class="space-y-4">
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>格式化日志时间戳</Label>
									<TogglePill
										checked={formatLogTimestamps}
										onchange={(checked) => {
											appSettings.setFormatLogTimestamps(checked);
											toast.success(checked ? 'Log timestamp formatting enabled' : 'Log timestamp formatting disabled');
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">将日志中的 ISO 时间戳转换为您配置的日期/时间格式</p>
								<div class="flex items-start gap-1.5 mt-1">
									<Info class="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
									<p class="text-xs text-muted-foreground">Docker 日志默认使用 UTC 时间戳。启用后，时间戳将类似于<code class="bg-muted px-1 rounded">2026-01-12T07:47:44Z</code> are converted to local time using your date/time settings.</p>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Layers class="w-4 h-4" />编排操作日志</Card.Title>
					<p class="text-xs text-muted-foreground">选择哪些编排操作会打开完整的 compose-log 弹出窗口。未选中的操作会静默运行，仅显示一条提示信息；如果操作失败，其日志仍会自动打开。</p>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
						{#each STACK_LOG_OPERATIONS as op}
							<div class="flex items-center gap-3">
								<TogglePill
									checked={stackLogOperations.includes(op.key)}
									onchange={(checked) => toggleStackLogOperation(op.key, checked)}
									disabled={!$canAccess('settings', 'edit')}
								/>
								<Label>{op.label}</Label>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<FileText class="w-4 h-4" />编写模板</Card.Title>
					<p class="text-xs text-muted-foreground">创建新编排时的默认 YAML 内容。</p>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="h-64">
						<CodeEditor
							value={composeTemplateWIP}
							onchange={(v) => { composeTemplateWIP = v; }}
							language="yaml"
							readonly={!$canAccess('settings', 'edit')}
							class="h-full rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700"
						/>
					</div>
					{#if $canAccess('settings', 'edit')}
						<div class="flex gap-2">
							<Button size="sm" variant="outline" onclick={saveComposeTemplate}>
								<Save class="w-3.5 h-3.5" />保存模板</Button>
							<Button size="sm" variant="ghost" onclick={revertComposeTemplate}>
								<RotateCcw class="w-3.5 h-3.5" />还原默认设置</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

		</div>

		<!-- Right column -->
		<div class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<ShieldCheck class="w-4 h-4" />漏洞扫描器</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="grype-image">Grype 镜像</Label>
						<Input
							id="grype-image"
							value={defaultGrypeImage}
							onblur={handleGrypeImageBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"anchore/grype:v0.110.0"}
						/>
						<p class="text-xs text-muted-foreground">Grype 扫描器的 Docker 镜像。锁定到特定版本，以确保供应链安全。</p>
					</div>
					<div class="space-y-2">
						<Label for="trivy-image">Trivy 镜像</Label>
						<Input
							id="trivy-image"
							value={defaultTrivyImage}
							onblur={handleTrivyImageBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"aquasec/trivy:0.69.3"}
						/>
						<p class="text-xs text-muted-foreground">Trivy 扫描仪的 Docker 镜像。锁定到特定版本，以确保供应链安全。</p>
					</div>
					<div class="space-y-2">
						<Label for="grype-args">默认的 Grype 参数</Label>
						<Input
							id="grype-args"
							value={defaultGrypeArgs}
							onblur={handleGrypeArgsBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"-o json -v {image}"}
						/>
						<p class="text-xs text-muted-foreground">使用<code class="bg-muted px-1 rounded">{'{image}'}</code> as placeholder for the image name</p>
					</div>
					<div class="space-y-2">
						<Label for="trivy-args">默认 Trivy 参数</Label>
						<Input
							id="trivy-args"
							value={defaultTrivyArgs}
							onblur={handleTrivyArgsBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"image --format json {image}"}
						/>
						<p class="text-xs text-muted-foreground">使用<code class="bg-muted px-1 rounded">{'{image}'}</code> as placeholder for the image name</p>
					</div>
					<div class="pt-2">
						<button
							type="button"
							class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 select-none"
							onclick={() => (showAdvancedScannerSettings = !showAdvancedScannerSettings)}
						>
							{#if showAdvancedScannerSettings}
								<ChevronDown class="w-3.5 h-3.5" />
							{:else}
								<ChevronRight class="w-3.5 h-3.5" />
							{/if}
							Advanced settings
						</button>
					</div>
					{#if showAdvancedScannerSettings}
						<div class="space-y-2">
							<Label for="scanner-network-mode">网络模式</Label>
							<Select.Root
								type="single"
								value={defaultScannerNetworkMode}
								onValueChange={handleScannerNetworkModeChange}
							>
								<Select.Trigger id="scanner-network-mode" class="w-full" disabled={!$canAccess('settings', 'edit')}>
									<span>{defaultScannerNetworkMode || '默认值（自动检测）'}</span>
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="">默认值（自动检测）</Select.Item>
									<Select.Item value="host">host</Select.Item>
									<Select.Item value="bridge">bridge</Select.Item>
									<Select.Item value="none">none</Select.Item>
								</Select.Content>
							</Select.Root>
							<p class="text-xs text-muted-foreground">覆盖漏洞扫描器容器的 Docker 网络模式。<code class="bg-muted px-1 rounded">host</code> on hosts where the default bridge can't reach the internet (e.g. iptables disabled, SELinux restricted).</p>
						</div>
						<div class="space-y-2">
							<Label for="scanner-dns">DNS服务器</Label>
							<Input
								id="scanner-dns"
								value={defaultScannerDns.join(', ')}
								onblur={handleScannerDnsBlur}
								disabled={!$canAccess('settings', 'edit')}
							/>
							<p class="text-xs text-muted-foreground">扫描器容器的 DNS IP 地址，以逗号分隔。为空表示从 Docker 守护程序继承。</p>
						</div>
					{/if}
					<div class="pt-2 border-t">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">扫描仪缓存</p>
								<p class="text-xs text-muted-foreground">删除缓存的漏洞数据库以释放磁盘空间。下次扫描将重新下载最新数据（约 200MB）。</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled={clearingCache || !$canAccess('settings', 'edit')}
								onclick={clearScannerCache}
							>
								{#if clearingCache}
									Clearing...
								{:else}
									Clear cache
								{/if}
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Tags class="w-4 h-4" />新版本标签</Card.Title>
					<Card.Description>
						How the update check looks for newer version tags on pinned images. Applies to every
						check - scheduled and manual. Per-environment settings decide whether to check on a
						schedule; this decides how versions are compared.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<SemverCheckConfig
						bind:enabled={semverEnabled}
						bind:maxBump={semverMaxBump}
						bind:matchFlavor={semverMatchFlavor}
						bind:includePrerelease={semverIncludePrerelease}
					/>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Database class="w-4 h-4" />系统作业</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-3">
						<div>
							<div class="flex items-center gap-2">
								<Label>活动事件收集模式</Label>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
									</Tooltip.Trigger>
									<Tooltip.Content class="w-80">
										<p class="text-xs">
											<strong>溪流：</strong>来自 Docker 的持续事件流、即时通知、更高的 CPU 使用率<br />
											<strong>轮询：</strong>定期检查新事件，通知略有延迟，CPU占用率较低</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</div>
							<div class="flex items-center gap-4 mt-2">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="eventCollectionMode"
										value="stream"
										checked={(eventCollectionMode || 'stream') === 'stream'}
										onchange={() => handleEventCollectionModeChange('stream')}
										disabled={!$canAccess('settings', 'edit')}
										class="accent-primary w-4 h-4"
									/>
									<Activity class="w-3.5 h-3.5" />
									<span class="text-sm">流式</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="eventCollectionMode"
										value="poll"
										checked={(eventCollectionMode || 'stream') === 'poll'}
										onchange={() => handleEventCollectionModeChange('poll')}
										disabled={!$canAccess('settings', 'edit')}
										class="accent-primary w-4 h-4"
									/>
									<Clock class="w-3.5 h-3.5" />
									<span class="text-sm">轮询</span>
								</label>

								<span class="text-xs text-muted-foreground {(eventCollectionMode || 'stream') === 'poll' ? '' : 'invisible'}">every</span>
								<Select.Root
									type="single"
									value={String(eventPollInterval || 60000)}
									onValueChange={(v) => v && handleEventPollIntervalChange({ value: parseInt(v) })}
									disabled={!$canAccess('settings', 'edit') || (eventCollectionMode || 'stream') !== 'poll'}
								>
									<Select.Trigger class="w-24 h-8 {(eventCollectionMode || 'stream') === 'poll' ? '' : 'invisible'}">
										{(eventPollInterval || 60000) === 30000 ? '30s' : (eventPollInterval || 60000) === 60000 ? '60s' : (eventPollInterval || 60000) === 120000 ? '120s' : '300s'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="30000">30s</Select.Item>
										<Select.Item value="60000">60s</Select.Item>
										<Select.Item value="120000">120s</Select.Item>
										<Select.Item value="300000">300s</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</div>

					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-2">
							<Label for="metrics-interval">指标收集间隔</Label>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
								</Tooltip.Trigger>
								<Tooltip.Content class="w-80">
									<p class="text-xs">
										How often to collect CPU/memory metrics from running containers. Lower intervals
										provide more frequent updates but increase CPU usage.
									</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</div>
						<div class="flex items-center gap-2 mt-2">
							<Select.Root
								type="single"
								value={String(metricsCollectionInterval || 30000)}
								onValueChange={(v) => v && handleMetricsIntervalChange({ value: parseInt(v) })}
								disabled={!$canAccess('settings', 'edit')}
							>
								<Select.Trigger class="w-24 h-8">
									{(metricsCollectionInterval || 30000) === 10000 ? '10s' : (metricsCollectionInterval || 30000) === 30000 ? '30s' : (metricsCollectionInterval || 30000) === 60000 ? '60s' : '120s'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="10000">10s</Select.Item>
									<Select.Item value="30000">30s</Select.Item>
									<Select.Item value="60000">60s</Select.Item>
									<Select.Item value="120000">120s</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label for="schedule-retention">计划执行清理</Label>
							<TogglePill
								checked={scheduleCleanupEnabled}
								onchange={handleScheduleCleanupEnabledChange}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">删除早于指定天数的执行记录</p>
						<div class="flex items-center gap-2 mt-2">
							<Input
								id="schedule-retention"
								type="number"
								min="1"
								max="365"
								value={scheduleRetentionDays}
								onchange={handleScheduleRetentionChange}
								disabled={!$canAccess('settings', 'edit') || !scheduleCleanupEnabled}
								class="w-20"
							/>
							<span class="text-sm text-muted-foreground">days</span>
							<div class="ml-auto">
								<CronEditor
									value={scheduleCleanupCron}
									onchange={handleScheduleCleanupCronChange}
									disabled={!$canAccess('settings', 'edit') || !scheduleCleanupEnabled}
								/>
							</div>
						</div>
					</div>
					<div class="space-y-1">
						<div class="flex items-center gap-3">
							<Label for="event-retention">容器事件清理</Label>
							<TogglePill
								checked={eventCleanupEnabled}
								onchange={handleEventCleanupEnabledChange}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">删除超过指定天数的事件</p>
						<div class="flex items-center gap-2 mt-2">
							<Input
								id="event-retention"
								type="number"
								min="1"
								max="365"
								value={eventRetentionDays}
								onchange={handleEventRetentionChange}
								disabled={!$canAccess('settings', 'edit') || !eventCleanupEnabled}
								class="w-20"
							/>
							<span class="text-sm text-muted-foreground">days</span>
							<div class="ml-auto">
								<CronEditor
									value={eventCleanupCron}
									onchange={handleEventCleanupCronChange}
									disabled={!$canAccess('settings', 'edit') || !eventCleanupEnabled}
								/>
							</div>
						</div>
					</div>
					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label>卷助手清理</Label>
							<Badge variant="secondary" class="text-xs">始终启用</Badge>
						</div>
						<p class="text-xs text-muted-foreground">
							Automatically removes temporary containers used for browsing volume contents.
							Runs every 30 minutes and on startup.
						</p>
					</div>
					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label>扫描仪缓存清理</Label>
							<TogglePill
								checked={scannerCleanupEnabled}
								onchange={handleScannerCleanupEnabledChange}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">删除缓存的漏洞数据库以回收磁盘空间</p>
						{#if scannerCleanupEnabled}
							<div class="mt-2">
								<CronEditor
									value={scannerCleanupCron}
									onchange={handleScannerCleanupCronChange}
									disabled={!$canAccess('settings', 'edit')}
								/>
							</div>
						{/if}
					</div>
					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label>部署日志协调</Label>
							<Tooltip.Provider delayDuration={100}>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<HelpCircle class="w-4 h-4 text-muted-foreground cursor-help" />
									</Tooltip.Trigger>
									<Tooltip.Portal>
										<Tooltip.Content side="right" sideOffset={8} class="!w-80">
											Every deploy from Dockhand keeps a log file on disk, linked to its run in the
											Deploys tab. This job runs on a schedule to keep the two in sync: it deletes
											orphaned log files whose deploy run was already removed, and marks a run whose
											log file has gone missing (so the Deploys tab shows "log unavailable" instead
											of a blank). It never deletes a deploy run itself.
										</Tooltip.Content>
									</Tooltip.Portal>
								</Tooltip.Root>
							</Tooltip.Provider>
							<TogglePill
								checked={deployLogReconcileEnabled}
								onchange={handleDeployLogReconcileEnabledChange}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">保持部署日志文件与其部署记录同步：删除运行已丢失的日志，并标记日志丢失的运行（从不删除运行）。</p>
						{#if deployLogReconcileEnabled}
							<div class="mt-2">
								<CronEditor
									value={deployLogReconcileCron}
									onchange={handleDeployLogReconcileCronChange}
									disabled={!$canAccess('settings', 'edit')}
								/>
							</div>
						{/if}
					</div>
					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label>保护扫描仪镜像免遭清理</Label>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
								</Tooltip.Trigger>
								<Tooltip.Content side="top" class="w-96 max-w-[90vw]">
									<p>启用“清理所有未使用项”后，Dockhand 的 grype 和 trivy 扫描器镜像将被跳过，这样下次扫描就无需重新拉取它们（以及重新下载约 100MB 的漏洞数据库）。禁用后，清理操作将与 Docker 默认行为相同，可能会删除这些镜像。</p>
								</Tooltip.Content>
							</Tooltip.Root>
							<TogglePill
								checked={$appSettings.protectScannerImages}
								onchange={(checked) => {
									appSettings.setProtectScannerImages(checked);
									toast.success(checked ? 'Scanner images will be skipped during prune' : 'Scanner images will be pruned with everything else');
								}}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">在“删除所有未使用的镜像”期间跳过 grype 和 trivy 镜像</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<LayoutDashboard class="w-4 h-4" />仪表盘</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-3">
						<div class="space-y-1">
							<div class="flex items-center gap-3">
								<Label>环境标签过滤器匹配</Label>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
									</Tooltip.Trigger>
									<Tooltip.Content class="w-80">
										<p class="text-xs">控制仪表盘上如何筛选多个选定的环境标签。<strong>"Any"</strong>: shows environments that have at least one of the selected labels.
											<strong>"全部"</strong>: shows only environments that have every selected label.
										</p>
									</Tooltip.Content>
								</Tooltip.Root>
								<ToggleSwitch
									value={labelFilterMode}
									leftValue="any"
									rightValue="all"
									onchange={(mode) => appSettings.setLabelFilterMode(mode as LabelFilterMode)}
									disabled={!$canAccess('settings', 'edit')}
								/>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
