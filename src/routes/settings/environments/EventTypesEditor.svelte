<script lang="ts">
	import { TogglePill } from '$lib/components/ui/toggle-pill';
	import {
		Box,
		RefreshCw,
		GitBranch,
		Layers,
		Shield,
		HardDrive,
		Archive,
		ChevronDown,
		ChevronRight
	} from 'lucide-svelte';
	import { page } from '$app/stores'; // BETA GATE: backups feature flag

	interface EventType {
		id: string;
		label: string;
		description: string;
	}

	interface EventGroup {
		id: string;
		label: string;
		icon: typeof Box;
		events: EventType[];
	}

	interface Props {
		selectedEventTypes: string[];
		onchange: (eventTypes: string[]) => void;
		disabled?: boolean;
	}

	let { selectedEventTypes, onchange, disabled = false }: Props = $props();

	// Track collapsed state for groups
	let collapsedGroups = $state<Set<string>>(new Set());

	function toggleGroup(groupId: string) {
		if (collapsedGroups.has(groupId)) {
			collapsedGroups = new Set([...collapsedGroups].filter(id => id !== groupId));
		} else {
			collapsedGroups = new Set([...collapsedGroups, groupId]);
		}
	}

	// Notification event types - grouped by category with icons
	const NOTIFICATION_EVENT_GROUPS: EventGroup[] = [
		{
			id: 'container',
			label: '容器事件',
			icon: Box,
			events: [
				{ id: 'container_started', label: '容器已启动', description: '当容器开始运行时' },
				{ id: 'container_stopped', label: '容器已停止', description: '当容器停止运行时' },
				{ id: 'container_restarted', label: '容器已重启', description: '容器重启时' },
				{ id: 'container_exited', label: '容器已退出', description: '容器意外退出时' },
				{ id: 'container_unhealthy', label: '容器不健康', description: '当容器健康检查失败时' },
				{ id: 'container_healthy', label: '容器健康', description: '容器健康检查还原时' },
				{ id: 'container_oom', label: '容器内存不足终止', description: '当容器因内存不足而被终止时' },
				{ id: 'container_updated', label: '容器已更新', description: '当容器镜像更新时' }
			]
		},
		{
			id: 'auto_update',
			label: '自动更新事件',
			icon: RefreshCw,
			events: [
				{ id: 'auto_update_success', label: '更新成功', description: '容器已成功更新到新镜像' },
				{ id: 'auto_update_failed', label: '更新失败', description: '容器自动更新失败' },
				{ id: 'auto_update_blocked', label: '更新被阻止', description: '由于漏洞标准，更新被阻止' },
				{ id: 'updates_detected', label: '检测到更新', description: '容器镜像更新可用' },
				{ id: 'batch_update_success', label: '批量更新完成', description: '计划容器更新已完成' }
			]
		},
		{
			id: 'git_stack',
			label: 'Git 编排事件',
			icon: GitBranch,
			events: [
				{ id: 'git_sync_success', label: 'Git 同步成功', description: 'Git编排已成功同步和部署' },
				{ id: 'git_sync_failed', label: 'Git 同步失败', description: 'Git编排同步或部署失败' },
				{ id: 'git_sync_skipped', label: 'Git 同步已跳过', description: 'Git 编排同步已跳过（无更改）' }
			]
		},
		{
			id: 'stack',
			label: '编排事件',
			icon: Layers,
			events: [
				{ id: 'stack_started', label: '编排已启动', description: '当编排启动时' },
				{ id: 'stack_stopped', label: '编排已停止', description: '当编排停止时' },
				{ id: 'stack_deployed', label: '编排已部署', description: '编排已部署（新建或更新）' },
				{ id: 'stack_deploy_failed', label: '编排部署失败', description: '编排部署失败' }
			]
		},
		{
			id: 'security',
			label: '安全事件',
			icon: Shield,
			events: [
				{ id: 'vulnerability_critical', label: '发现关键漏洞', description: '镜像扫描中发现严重漏洞' },
				{ id: 'vulnerability_high', label: '发现高漏洞', description: '发现高危漏洞' },
				{ id: 'vulnerability_any', label: '发现的任何漏洞', description: '发现的漏洞（中/低）' }
			]
		},
		{
			id: 'backup',
			label: '备份事件',
			icon: Archive,
			events: [
				{ id: 'backup_success', label: '备份成功', description: '备份已成功完成' },
				{ id: 'backup_failed', label: '备份失败', description: '备份失败' },
				{ id: 'restore_success', label: '还原成功。', description: '还原已成功完成' },
				{ id: 'restore_failed', label: '还原失败', description: '还原失败' }
			]
		},
		{
			id: 'system',
			label: '系统事件',
			icon: HardDrive,
			events: [
				{ id: 'image_pulled', label: '镜像已拉取', description: '当拉取新镜像时' },
				{ id: 'image_prune_success', label: '镜像清理完成', description: '计划镜像清理已成功完成' },
				{ id: 'image_prune_failed', label: '镜像清理失败', description: '计划镜像清理失败' },
				{ id: 'environment_offline', label: '环境离线', description: '环境变得无法到达' },
				{ id: 'environment_online', label: '在线环境', description: '环境已还原在线' },
				{ id: 'disk_space_warning', label: '磁盘空间警告', description: 'Docker 磁盘使用量超过阈值' }
			]
		}
	];

	function toggleEvent(eventId: string) {
		if (disabled) return;

		const newTypes = selectedEventTypes.includes(eventId)
			? selectedEventTypes.filter(t => t !== eventId)
			: [...selectedEventTypes, eventId];
		onchange(newTypes);
	}

	function toggleGroupAll(group: EventGroup) {
		if (disabled) return;

		const groupEventIds = group.events.map(e => e.id);
		const allSelected = groupEventIds.every(id => selectedEventTypes.includes(id));

		let newTypes: string[];
		if (allSelected) {
			// Deselect all from this group
			newTypes = selectedEventTypes.filter(id => !groupEventIds.includes(id));
		} else {
			// Select all from this group
			const toAdd = groupEventIds.filter(id => !selectedEventTypes.includes(id));
			newTypes = [...selectedEventTypes, ...toAdd];
		}
		onchange(newTypes);
	}

	function getGroupSelectedCount(group: EventGroup): number {
		return group.events.filter(e => selectedEventTypes.includes(e.id)).length;
	}
</script>

<div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
	<!-- BETA GATE: drop the Backup events group unless FEAT_BACKUPS_ENABLED (see features.ts) -->
	{#each NOTIFICATION_EVENT_GROUPS.filter((g) => g.id !== 'backup' || $page.data.backupsEnabled) as group (group.id)}
		{@const isCollapsed = collapsedGroups.has(group.id)}
		{@const selectedCount = getGroupSelectedCount(group)}
		{@const allSelected = selectedCount === group.events.length}
		{@const someSelected = selectedCount > 0 && selectedCount < group.events.length}
		{@const GroupIcon = group.icon}

		<div class="rounded-lg border bg-card">
			<!-- Group Header -->
			<div
				class="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors rounded-t-lg cursor-pointer"
				role="button"
				tabindex="0"
				onclick={() => toggleGroup(group.id)}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(group.id); } }}
			>
				<div class="flex items-center gap-2">
					{#if isCollapsed}
						<ChevronRight class="w-4 h-4 text-muted-foreground" />
					{:else}
						<ChevronDown class="w-4 h-4 text-muted-foreground" />
					{/if}
					<GroupIcon class="w-4 h-4 text-muted-foreground" />
					<span class="text-sm font-medium">{group.label}</span>
					<span class="text-xs text-muted-foreground">
						({selectedCount}/{group.events.length})
					</span>
				</div>
				<button
					type="button"
					class="text-xs px-2 py-0.5 rounded border transition-colors {allSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}"
					onclick={(e) => { e.stopPropagation(); toggleGroupAll(group); }}
					{disabled}
				>
					{allSelected ? '全部' : someSelected ? 'Some' : '无'}
				</button>
			</div>

			<!-- Group Events -->
			{#if !isCollapsed}
				<div class="ml-4 mb-2 border-l-2 border-muted bg-muted/20 rounded-bl">
					{#each group.events as event (event.id)}
						{@const isSelected = selectedEventTypes.includes(event.id)}
						<div class="flex items-center justify-between pl-3 pr-1 py-1.5 hover:bg-muted/40 transition-colors border-b border-border/30 last:border-b-0">
							<div class="flex-1 min-w-0 pr-2">
								<div class="text-xs font-medium">{event.label}</div>
								<div class="text-2xs text-muted-foreground truncate">{event.description}</div>
							</div>
							<TogglePill
								checked={isSelected}
								onchange={() => toggleEvent(event.id)}
								{disabled}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
