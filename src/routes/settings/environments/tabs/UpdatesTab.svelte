<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { TogglePill } from '$lib/components/ui/toggle-pill';
	import CronEditor from '$lib/components/cron-editor.svelte';
	import TimezoneSelector from '$lib/components/TimezoneSelector.svelte';
	import VulnerabilityCriteriaSelector, { type VulnerabilityCriteria } from '$lib/components/VulnerabilityCriteriaSelector.svelte';
	import { CircleFadingArrowUp, CircleArrowUp, RefreshCw, Info, Trash2 } from 'lucide-svelte';
	import { formatDateTime } from '$lib/stores/settings';
	import { formatBytes } from '$lib/utils/format';

	interface Props {
		// Update check settings
		updateCheckLoading: boolean;
		updateCheckEnabled: boolean;
		updateCheckCron: string;
		updateCheckAutoUpdate: boolean;
		updateCheckVulnerabilityCriteria: VulnerabilityCriteria;
		scannerEnabled: boolean;
		// Image prune settings
		imagePruneLoading: boolean;
		imagePruneEnabled: boolean;
		imagePruneCron: string;
		imagePruneMode: 'dangling' | 'all';
		imagePruneLastPruned?: string;
		imagePruneLastResult?: { spaceReclaimed: number; imagesRemoved: number };
		// Timezone
		timezone: string;
	}

	let {
		updateCheckLoading,
		updateCheckEnabled = $bindable(),
		updateCheckCron = $bindable(),
		updateCheckAutoUpdate = $bindable(),
		updateCheckVulnerabilityCriteria = $bindable(),
		scannerEnabled,
		imagePruneLoading,
		imagePruneEnabled = $bindable(),
		imagePruneCron = $bindable(),
		imagePruneMode = $bindable(),
		imagePruneLastPruned,
		imagePruneLastResult,
		timezone = $bindable()
	}: Props = $props();

</script>

<!-- Scheduled Update Check Section -->
<div class="space-y-4">
	<div class="text-sm font-medium">计划更新检查</div>
	<p class="text-xs text-muted-foreground">定期检查此环境中所有容器是否有可用的镜像更新。</p>

	{#if updateCheckLoading}
		<div class="flex items-center justify-center py-4">
			<RefreshCw class="w-5 h-5 animate-spin text-muted-foreground" />
		</div>
	{:else}
		<div class="flex items-start gap-2">
			<CircleFadingArrowUp class="w-4 h-4 text-green-500 glow-green mt-0.5 shrink-0" />
			<div class="flex-1">
				<Label>启用计划更新检查</Label>
				<p class="text-xs text-muted-foreground">按计划自动检查容器更新</p>
			</div>
			<TogglePill bind:checked={updateCheckEnabled} />
		</div>

		{#if updateCheckEnabled}
			<div class="flex items-start gap-2">
				<div class="w-4 shrink-0"></div>
				<div class="flex-1 space-y-2">
					<Label>计划任务</Label>
					<CronEditor value={updateCheckCron} onchange={(cron) => updateCheckCron = cron} />
				</div>
			</div>

			<div class="flex items-start gap-2">
				<CircleArrowUp class="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
				<div class="flex-1">
					<Label>自动更新容器</Label>
					<p class="text-xs text-muted-foreground">
						When enabled, containers will be updated automatically when new images are found.
						When disabled, only sends notifications about available updates.
					</p>
				</div>
				<TogglePill bind:checked={updateCheckAutoUpdate} />
			</div>

			{#if updateCheckAutoUpdate && scannerEnabled}
				<div class="flex items-start gap-2">
					<div class="w-4 shrink-0"></div>
					<div class="flex-1">
						<Label>存在漏洞的阻止更新</Label>
						<p class="text-xs text-muted-foreground">如果新镜像存在超出此标准的漏洞，则阻止自动更新。</p>
					</div>
					<VulnerabilityCriteriaSelector
						bind:value={updateCheckVulnerabilityCriteria}
						class="w-[200px]"
					/>
				</div>
			{/if}

			<div class="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 flex items-start gap-2">
				<Info class="w-3 h-3 mt-0.5 shrink-0" />
				{#if updateCheckAutoUpdate}
					{#if scannerEnabled && updateCheckVulnerabilityCriteria !== 'never'}
						<span>新镜像会被拉取到临时标签，进行扫描，如果通过漏洞检查则会部署。被阻止的镜像会被自动删除。</span>
					{:else}
						<span>当有新镜像可用时，容器将自动更新。</span>
					{/if}
				{:else}
					<span>更新可用时，您将收到通知。容器不会被修改。</span>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<!-- Image Pruning Section -->
<div class="space-y-4 pt-4 border-t">
	<div class="text-sm font-medium">自动镜像清理</div>
	<p class="text-xs text-muted-foreground">按计划自动删除未使用的 Docker 镜像，以释放磁盘空间。</p>

	{#if imagePruneLoading}
		<div class="flex items-center justify-center py-4">
			<RefreshCw class="w-5 h-5 animate-spin text-muted-foreground" />
		</div>
	{:else}
		<div class="flex items-start gap-2">
			<Trash2 class="w-4 h-4 text-amber-500 glow-amber mt-0.5 shrink-0" />
			<div class="flex-1">
				<Label>启用自动镜像清理</Label>
				<p class="text-xs text-muted-foreground">按计划自动删除未使用的镜像</p>
			</div>
			<TogglePill bind:checked={imagePruneEnabled} />
		</div>

		{#if imagePruneEnabled}
			<div class="flex items-start gap-2">
				<div class="w-4 shrink-0"></div>
				<div class="flex-1 space-y-2">
					<Label>计划任务</Label>
					<CronEditor value={imagePruneCron} onchange={(cron) => imagePruneCron = cron} />
				</div>
			</div>

			<div class="flex items-start gap-2">
				<div class="w-4 shrink-0"></div>
				<div class="flex-1 space-y-2">
					<Label>清理模式</Label>
					<Select.Root type="single" bind:value={imagePruneMode}>
						<Select.Trigger class="w-full">
							{imagePruneMode === 'dangling' ? '仅悬挂镜像' : '所有未使用的镜像'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="dangling">仅悬挂镜像</Select.Item>
							<Select.Item value="all">所有未使用的镜像</Select.Item>
						</Select.Content>
					</Select.Root>
					<p class="text-xs text-muted-foreground">
						{#if imagePruneMode === 'dangling'}
							Only removes untagged image layers (safest option)
						{:else}
							Removes all images not used by any container (more aggressive)
						{/if}
					</p>
				</div>
			</div>

			{#if imagePruneLastPruned}
				<div class="flex items-start gap-2">
					<div class="w-4 shrink-0"></div>
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">
							Last pruned: {formatDateTime(imagePruneLastPruned)}
							{#if imagePruneLastResult}
								- {imagePruneLastResult.imagesRemoved} images removed, {formatBytes(imagePruneLastResult.spaceReclaimed)} reclaimed
							{/if}
						</p>
					</div>
				</div>
			{/if}

			<div class="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 flex items-start gap-2">
				<Info class="w-3 h-3 mt-0.5 shrink-0" />
				<span>正在运行或已停止的容器所使用的镜像将永远不会被删除。</span>
			</div>
		{/if}
	{/if}
</div>

<!-- Timezone selector -->
<div class="space-y-2">
	<Label>时区</Label>
	<TimezoneSelector
		bind:value={timezone}
		id="edit-env-timezone"
	/>
	<p class="text-xs text-muted-foreground">用于安排自动更新、git 同步和镜像清理</p>
</div>
