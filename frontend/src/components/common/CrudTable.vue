<template>
  <el-card>
    <template #header>
      <div class="crud-table-header">
        <span>{{ title }}</span>
        <el-space>
          <el-button v-if="showAdd" type="primary" @click="$emit('add')">
            新增
          </el-button>
          <el-button v-if="showRefresh" @click="$emit('refresh')">
            刷新
          </el-button>
        </el-space>
      </div>
    </template>

    <el-table
      :data="data"
      v-loading="loading"
      border
      stripe
      :height="height"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <el-table-column v-if="showSelection" type="selection" width="55" />

      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :sortable="col.sortable"
        :fixed="col.fixed"
        :align="col.align || 'left'"
      >
        <template #default="{ row }" v-if="col.slot">
          <slot :name="col.slot" :row="row" />
        </template>
        <template #default="{ row }" v-else-if="col.formatter">
          {{ col.formatter?.(row[col.prop], row) }}
        </template>
        <template #default="{ row }" v-else-if="col.type === 'tag'">
          <el-tag :type="getTagType(row[col.prop], col.tagMap)">
            {{ getTagLabel(row[col.prop], col.tagMap) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        v-if="showActions"
        label="操作"
        :width="actionsWidth"
        fixed="right"
        align="center"
      >
        <template #default="{ row }">
          <slot name="actions" :row="row">
            <el-space>
              <el-button v-if="showEdit" size="small" @click="$emit('edit', row)">
                编辑
              </el-button>
              <el-button
                v-if="showDelete"
                size="small"
                type="danger"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </el-space>
          </slot>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="showPagination" class="crud-table-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePageSizeChange"
        @current-change="handleCurrentPageChange"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox } from 'element-plus'

export interface TableColumn {
  prop: string
  label: string
  width?: number | string
  minWidth?: number | string
  sortable?: boolean | string
  fixed?: boolean | string
  align?: 'left' | 'center' | 'right'
  slot?: string
  formatter?: (value: any, row: any) => string
  type?: 'tag'
  tagMap?: Record<string, { type: string; label: string }>
}

const props = withDefaults(
  defineProps<{
    title?: string
    data: any[]
    columns: TableColumn[]
    loading?: boolean
    height?: number | string
    showSelection?: boolean
    showAdd?: boolean
    showRefresh?: boolean
    showEdit?: boolean
    showDelete?: boolean
    showActions?: boolean
    actionsWidth?: number | string
    showPagination?: boolean
    total?: number
    pageSizes?: number[]
    defaultPageSize?: number
    defaultCurrentPage?: number
  }>(),
  {
    title: '数据列表',
    loading: false,
    showSelection: false,
    showAdd: false,
    showRefresh: true,
    showEdit: false,
    showDelete: false,
    showActions: true,
    actionsWidth: 200,
    showPagination: false,
    total: 0,
    pageSizes: () => [10, 20, 50, 100],
    defaultPageSize: 20,
    defaultCurrentPage: 1
  }
)

const emit = defineEmits<{
  add: []
  refresh: []
  edit: [row: any]
  delete: [row: any]
  selectionChange: [rows: any[]]
  sortChange: [sort: { prop: string; order: string }]
  pageChange: [page: number, size: number]
}>()

const currentPage = ref(props.defaultCurrentPage)
const pageSize = ref(props.defaultPageSize)

function handleSelectionChange(selection: any[]) {
  emit('selectionChange', selection)
}

function handleSortChange(sort: any) {
  emit('sortChange', { prop: sort.prop, order: sort.order })
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确认删除该记录吗?', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    emit('delete', row)
  } catch {
    // 用户取消
  }
}

function handlePageSizeChange(size: number) {
  pageSize.value = size
  emit('pageChange', currentPage.value, size)
}

function handleCurrentPageChange(page: number) {
  currentPage.value = page
  emit('pageChange', page, pageSize.value)
}

function getTagType(value: any, tagMap?: Record<string, { type: string; label: string }>) {
  return tagMap?.[value]?.type || 'info'
}

function getTagLabel(value: any, tagMap?: Record<string, { type: string; label: string }>) {
  return tagMap?.[value]?.label || value
}
</script>

<style scoped>
.crud-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.crud-table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>