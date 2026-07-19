/**
 * SettingsScreen — App settings with toggles and info
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';

interface SettingToggleProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}

function SettingToggle({label, subtitle, value, onToggle}: SettingToggleProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{false: colors.surface, true: colors.primary + '60'}}
        thumbColor={value ? colors.primary : colors.textTertiary}
      />
    </View>
  );
}

interface SettingLinkProps {
  label: string;
  value?: string;
  onPress?: () => void;
}

function SettingLink({label, value, onPress}: SettingLinkProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <Text style={styles.settingArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Càiặt</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Nhàầu tư</Text>
            <Text style={styles.profileEmail}>investor@stockai.vn</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Sửa</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>🔔 Thông báo</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Thông báo chung"
            subtitle="Bật/tắt tất cả thông báo"
            value={notifications}
            onToggle={setNotifications}
          />
          <View style={styles.divider} />
          <SettingToggle
            label="Tín hiệu AI"
            subtitle="Thông báo khi AI phát hiện cơ hội mua/bán"
            value={aiAlerts}
            onToggle={setAiAlerts}
          />
          <View style={styles.divider} />
          <SettingToggle
            label="Cảnh báo giá"
            subtitle="Thông báo khi giáạt mốcãặt"
            value={priceAlerts}
            onToggle={setPriceAlerts}
          />
          <View style={styles.divider} />
          <SettingToggle
            label="Tin tức quan trọng"
            subtitle="Tin tức ảnh hưởngến coin theo dõi"
            value={newsAlerts}
            onToggle={setNewsAlerts}
          />
        </View>

        {/* App Settings */}
        <Text style={styles.sectionTitle}>⚙️ Ứng dụng</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Chếộ tối"
            value={darkMode}
            onToggle={setDarkMode}
          />
          <View style={styles.divider} />
          <SettingToggle
            label="Xác thực sinh trắc học"
            subtitle="Face ID / Vân tay khi mở app"
            value={biometric}
            onToggle={setBiometric}
          />
          <View style={styles.divider} />
          <SettingLink label="Ngôn ngữ" value="Tiếng Việt" />
          <View style={styles.divider} />
          <SettingLink label="Đơn vị tiền tệ" value="USD ()" />
        </View>

        {/* Data & AI */}
        <Text style={styles.sectionTitle}>🧠 Dữ liệu & AI</Text>
        <View style={styles.section}>
          <SettingLink label="Nguồn dữ liệu" value="vnstock (VCI)" />
          <View style={styles.divider} />
          <SettingLink label="Tần suất phân tích" value="15 phút" />
          <View style={styles.divider} />
          <SettingLink label="Quản lý watchlist" value="8 mã" />
          <View style={styles.divider} />
          <SettingLink label="Cấu hình tín hiệu AI" />
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>ℹ️ Thông tin</Text>
        <View style={styles.section}>
          <SettingLink label="Phiên bản" value="1.0.0 (MVP)" />
          <View style={styles.divider} />
          <SettingLink label="Điều khoản sử dụng" />
          <View style={styles.divider} />
          <SettingLink label="Chính sách bảo mật" />
          <View style={styles.divider} />
          <SettingLink label="Liên hệ hỗ trợ" />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ StockAI chỉ cung cấp thông tin tham khảo, không phải tư vấnầu tư.
            Mọi quyếtịnhầu tư là trách nhiệm của người dùng.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  profileEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '20',
  },
  editBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  settingArrow: {
    ...typography.heading2,
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  disclaimer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.aiGoldBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.aiGold + '30',
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.aiGold,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});
