import { Alert, Button, Spin } from "antd";
import { useOutletContext } from "umi";
import BillingPage from "../admin/BillingPages.jsx";
import MessagesPage from "../admin/MessagesPage.jsx";
import SettingsPage from "../admin/SettingsPage.jsx";
import UserLedgerPage from "../admin/UserLedgerPage.jsx";
import RecommendationSettingsPage from "../admin/RecommendationSettingsPage.jsx";
import CharacterTagsPage from "../admin/CharacterTagsPage.jsx";
import {
  AnalyticsPage,
  CharacterEditorPage,
  CharacterListPage,
  CommercePage,
  DashboardPage,
  ModelConfigPage,
  PresetsPage,
  TokenUsagePage,
  UsersPage,
} from "../admin/Admin.jsx";

function CharacterRoute({ context }) {
  const {
    adminToken,
    batchPublishCharacters,
    batchRecommendCharacters,
    charList,
    characterPage,
    characterPageSize,
    characterFilters,
    characterSort,
    characterTotal,
    characterLoadError,
    characterLoadState,
    deleteCharacter,
    deletingCharacterId,
    editing,
    completeBatchCharacterImport,
    characterBatchAction,
    importBatchCharacter,
    importCharacter,
    isCharacterImporting,
    publishCharacterFromList,
    publishingCharacterId,
    retryCharacters,
    setCharacterPagination,
    setCharacterListFilters,
    setCharacterListSort,
    setEditing,
    toast,
    updateCharacterStatus,
    updateCharacterRecommendation,
    updatingRecommendationId,
  } = context;

  if (editing) {
    return (
      <CharacterEditorPage
        key={editing.id}
        character={editing}
        onBack={() => setEditing(null)}
        toast={toast}
        onStatusChange={updateCharacterStatus}
        adminToken={adminToken}
      />
    );
  }
  if (characterLoadState === "error") {
    return (
      <Alert
        type="error"
        showIcon
        message="角色数据加载失败"
        description={characterLoadError}
        action={<Button onClick={retryCharacters}>重新加载</Button>}
      />
    );
  }
  if (characterLoadState !== "loaded") {
    return <div className="ant-loading-state"><Spin size="large" /><span>正在加载角色数据…</span></div>;
  }
  return (
    <CharacterListPage
      list={charList}
      onEdit={setEditing}
      onImport={importCharacter}
      onBatchImport={importBatchCharacter}
      onBatchComplete={completeBatchCharacterImport}
      onDelete={deleteCharacter}
      isImporting={isCharacterImporting}
      deletingCharacterId={deletingCharacterId}
      publishingCharacterId={publishingCharacterId}
      updatingRecommendationId={updatingRecommendationId}
      batchAction={characterBatchAction}
      page={characterPage}
      pageSize={characterPageSize}
      total={characterTotal}
      onPageChange={setCharacterPagination}
      filters={characterFilters}
      sort={characterSort}
      onFilterChange={setCharacterListFilters}
      onSortChange={setCharacterListSort}
      onPublish={publishCharacterFromList}
      onBatchPublish={batchPublishCharacters}
      onBatchRecommend={batchRecommendCharacters}
      onRecommendationChange={updateCharacterRecommendation}
    />
  );
}

export default function AdminRoutePage() {
  const context = useOutletContext();
  const { adminToken, messageDetailId, page, toast } = context;

  switch (page) {
    case "analytics": return <AnalyticsPage toast={toast} adminToken={adminToken} />;
    case "token-usage": return <TokenUsagePage toast={toast} adminToken={adminToken} />;
    case "characters": return <CharacterRoute context={context} />;
    case "character-tags": return <CharacterTagsPage />;
    case "presets": return <PresetsPage toast={toast} adminToken={adminToken} />;
    case "models": return <ModelConfigPage toast={toast} adminToken={adminToken} />;
    case "users": return <UsersPage toast={toast} adminToken={adminToken} />;
    case "user-ledger": return <UserLedgerPage adminToken={adminToken} />;
    case "messages": return <MessagesPage adminToken={adminToken} detailId={messageDetailId} />;
    case "recommendations": return <RecommendationSettingsPage toast={toast} />;
    case "orders": return <BillingPage key="orders" adminToken={adminToken} />;
    case "subscriptions": return <BillingPage key="subscriptions" subscription adminToken={adminToken} />;
    case "commerce": return <CommercePage toast={toast} adminToken={adminToken} />;
    case "settings": return <SettingsPage adminToken={adminToken} />;
    default: return <DashboardPage toast={toast} adminToken={adminToken} />;
  }
}
