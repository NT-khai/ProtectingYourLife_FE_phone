import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { api, resolveImageUrl, UserProfilePayload } from '@/services/api';
import { getCurrentGPSLocation } from '@/services/location';

export default function ProfileScreen() {
  const { user, login, register, logout, refreshUser } = useAuth();

  // Authentication Tab: 'login' | 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginShowPass, setLoginShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regHovaten, setRegHovaten] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPass, setRegShowPass] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Profile data state
  const [hovaten, setHovaten] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  // App UI states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Load profile when user logs in
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const data = await api.profile.getMyProfile();
        if (data) {
          setHovaten(data.hovaten || user.hovaten || '');
          setSoDienThoai(data.soDienThoai || '');
          setDiaChi(data.diaChi || '');
          setAvatar(data.avatar || user.avatar || null);
        }
      } catch {
        setHovaten(user.hovaten || '');
        setAvatar(user.avatar || null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // ================== AUTH HANDLERS ==================

  const handleLogin = async () => {
    const emailTrim = loginEmail.trim();
    if (!emailTrim || !loginPassword.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoginLoading(true);
    try {
      await login(emailTrim, loginPassword);
      Alert.alert('Thành công', 'Đăng nhập thành công!');
    } catch (err: any) {
      Alert.alert(
        'Đăng nhập thất bại',
        err.message || 'Email hoặc mật khẩu không chính xác.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    const nameTrim = regHovaten.trim();
    const emailTrim = regEmail.trim();

    if (!nameTrim) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!emailTrim || !emailTrim.includes('@')) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email hợp lệ.');
      return;
    }
    if (regPassword.length < 6) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setRegLoading(true);
    try {
      await register(nameTrim, emailTrim, regPassword);
      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản đã được tạo thành công!',
        [
          {
            text: 'Bắt đầu ngay',
            onPress: async () => {
              try {
                await login(emailTrim, regPassword);
              } catch {
                setAuthTab('login');
                setLoginEmail(emailTrim);
                setLoginPassword(regPassword);
              }
            },
          },
        ]
      );
      // Tự động đăng nhập
      await login(emailTrim, regPassword);
    } catch (err: any) {
      Alert.alert('Đăng ký thất bại', err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setRegLoading(false);
    }
  };

  // ================== PROFILE EDIT HANDLERS ==================

  const handleGetGPSAddress = async () => {
    try {
      setGpsLoading(true);
      const loc = await getCurrentGPSLocation();
      setDiaChi(loc.address);
      Alert.alert(
        'Định vị GPS thành công',
        `Đã tự động điền địa chỉ từ vị trí GPS hiện tại:\n${loc.address}`
      );
    } catch (err: any) {
      Alert.alert('Lỗi GPS', err.message || 'Không thể lấy vị trí GPS từ thiết bị.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePickAvatar = () => {
    Alert.alert(
      'Ảnh đại diện',
      'Chọn hình ảnh đại diện của bạn:',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chụp ảnh mới', onPress: handleTakeAvatarPhoto },
        { text: 'Chọn từ thư viện', onPress: handleSelectAvatarFromLibrary },
      ]
    );
  };

  const handleTakeAvatarPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền máy ảnh', 'Vui lòng cấp quyền sử dụng máy ảnh trong cài đặt.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAvatarFromAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi chụp ảnh', err.message);
    }
  };

  const handleSelectAvatarFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh trong cài đặt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAvatarFromAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi chọn ảnh', err.message);
    }
  };

  const uploadAvatarFromAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setSaving(true);
      const res = await api.upload.uploadImage(asset.uri, asset.fileName, asset.mimeType);
      setAvatar(res.url);

      // Cập nhật cả hồ sơ user_profiles và users trong database
      await api.profile.updateMyProfile({
        hovaten: hovaten.trim() || user?.hovaten || 'Người dùng',
        soDienThoai: soDienThoai.trim(),
        diaChi: diaChi.trim(),
        avatar: res.url,
      });

      await refreshUser();
      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện mới!');
    } catch (err: any) {
      Alert.alert('Lỗi tải ảnh', err.message || 'Không thể tải ảnh đại diện lên máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const payload: Partial<UserProfilePayload> = {
        hovaten: hovaten.trim(),
        soDienThoai: soDienThoai.trim(),
        diaChi: diaChi.trim(),
        avatar: avatar || undefined,
      };

      await api.profile.updateMyProfile(payload);
      await refreshUser();
      Alert.alert('Thành công', 'Hồ sơ cá nhân đã được lưu thành công!');
    } catch (err: any) {
      Alert.alert('Lưu thất bại', err.message || 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          setAuthTab('login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Hồ Sơ An Toàn</Text>
            <Text style={styles.headerSubtitle}>
              Mạng lưới bảo vệ và cứu hộ an toàn cho người dân
            </Text>
          </View>

          {/* ======================================================== */}
          {/* PHẦN 1: CHƯA ĐĂNG NHẬP -> GIAO DIỆN ĐĂNG NHẬP / ĐĂNG KÝ */}
          {/* ======================================================== */}
          {!user ? (
            <View style={styles.authContainer}>
              {/* Segmented Control Switch */}
              <View style={styles.tabSwitchContainer}>
                <TouchableOpacity
                  style={[styles.tabSwitchBtn, authTab === 'login' && styles.tabSwitchBtnActive]}
                  onPress={() => setAuthTab('login')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="log-in-outline"
                    size={16}
                    color={authTab === 'login' ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.tabSwitchText,
                      authTab === 'login' && styles.tabSwitchTextActive,
                    ]}
                  >
                    Đăng Nhập
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabSwitchBtn, authTab === 'register' && styles.tabSwitchBtnActive]}
                  onPress={() => setAuthTab('register')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={16}
                    color={authTab === 'register' ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.tabSwitchText,
                      authTab === 'register' && styles.tabSwitchTextActive,
                    ]}
                  >
                    Đăng Ký
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CARD ĐĂNG NHẬP */}
              {authTab === 'login' && (
                <View style={styles.authCard}>
                  <View style={styles.authCardHeader}>
                    <View style={styles.authIconBadge}>
                      <Ionicons name="shield-checkmark" size={26} color="#EF4444" />
                    </View>
                    <Text style={styles.authTitle}>ĐĂNG NHẬP TÀI KHOẢN</Text>
                    <Text style={styles.authSubtitle}>
                      Đăng nhập để gửi báo cáo sự cố và lưu hồ sơ cá nhân
                    </Text>
                  </View>

                  {/* Email */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputInner}
                        placeholder="example@gmail.com"
                        placeholderTextColor="#64748B"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={loginEmail}
                        onChangeText={setLoginEmail}
                      />
                    </View>
                  </View>

                  {/* Mật khẩu */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Mật khẩu</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.inputInner, { flex: 1 }]}
                        placeholder="••••••••"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!loginShowPass}
                        value={loginPassword}
                        onChangeText={setLoginPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setLoginShowPass(!loginShowPass)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={loginShowPass ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Nút Đăng Nhập */}
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, loginLoading && { opacity: 0.7 }]}
                    onPress={handleLogin}
                    disabled={loginLoading}
                    activeOpacity={0.8}
                  >
                    {loginLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="log-in" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryActionBtnText}>ĐĂNG NHẬP NGAY</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Chuyển sang tab Đăng ký */}
                  <TouchableOpacity
                    style={styles.switchPromptBtn}
                    onPress={() => setAuthTab('register')}
                  >
                    <Text style={styles.switchPromptText}>
                      Chưa có tài khoản?{' '}
                      <Text style={styles.switchPromptHighlight}>Đăng ký tài khoản mới</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* CARD ĐĂNG KÝ */}
              {authTab === 'register' && (
                <View style={styles.authCard}>
                  <View style={styles.authCardHeader}>
                    <View style={[styles.authIconBadge, { borderColor: 'rgba(56, 189, 248, 0.4)' }]}>
                      <Ionicons name="person-add" size={26} color="#38BDF8" />
                    </View>
                    <Text style={styles.authTitle}>TẠO TÀI KHOẢN MỚI</Text>
                    <Text style={styles.authSubtitle}>
                      Gia nhập mạng lưới bảo vệ và cứu hộ an toàn cho người dân
                    </Text>
                  </View>

                  {/* Họ và tên */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Họ và tên</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputInner}
                        placeholder="Nguyễn Văn An"
                        placeholderTextColor="#64748B"
                        value={regHovaten}
                        onChangeText={setRegHovaten}
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Địa chỉ Email</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputInner}
                        placeholder="example@gmail.com"
                        placeholderTextColor="#64748B"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={regEmail}
                        onChangeText={setRegEmail}
                      />
                    </View>
                  </View>

                  {/* Mật khẩu */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Mật khẩu (tối thiểu 6 ký tự)</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.inputInner, { flex: 1 }]}
                        placeholder="••••••••"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!regShowPass}
                        value={regPassword}
                        onChangeText={setRegPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setRegShowPass(!regShowPass)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={regShowPass ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Xác nhận mật khẩu */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Xác nhận lại mật khẩu</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputInner}
                        placeholder="••••••••"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!regShowPass}
                        value={regConfirmPassword}
                        onChangeText={setRegConfirmPassword}
                      />
                    </View>
                  </View>

                  {/* Nút Đăng Ký */}
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, regLoading && { opacity: 0.7 }]}
                    onPress={handleRegister}
                    disabled={regLoading}
                    activeOpacity={0.8}
                  >
                    {regLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryActionBtnText}>TẠO TÀI KHOẢN NGƯỜI DÙNG</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Chuyển sang tab Đăng nhập */}
                  <TouchableOpacity
                    style={styles.switchPromptBtn}
                    onPress={() => setAuthTab('login')}
                  >
                    <Text style={styles.switchPromptText}>
                      Đã có tài khoản?{' '}
                      <Text style={styles.switchPromptHighlight}>Đăng nhập ngay</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* ======================================================== */
            /* PHẦN 2: ĐÃ ĐĂNG NHẬP -> HỒ SƠ NGƯỜI DÙNG & GPS CÁ NHÂN */
            /* ======================================================== */
            <View>
              {/* Profile Hero Card */}
              <View style={styles.profileHero}>
                <View style={styles.avatarWrapper}>
                  {avatar ? (
                    <Image source={{ uri: resolveImageUrl(avatar) }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {hovaten ? hovaten.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.cameraIconBtn} onPress={handlePickAvatar}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.profileHeroInfo}>
                  <Text style={styles.profileHeroName}>{hovaten || user.email}</Text>
                  <Text style={styles.profileHeroEmail}>{user.email}</Text>
                  {/* PURE USER ROLE BADGE - KHÔNG CÓ ADMIN */}
                  <View style={styles.roleTag}>
                    <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                    <Text style={styles.roleTagText}>Thành viên An Toàn</Text>
                  </View>
                </View>
              </View>

              {/* Form Thông tin hồ sơ */}
              <View style={styles.formCard}>
                <Text style={styles.cardHeader}>THÔNG TIN HỒ SƠ CÁ NHÂN</Text>

                {/* Họ và tên */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Họ và tên</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nguyễn Văn An"
                    placeholderTextColor="#64748B"
                    value={hovaten}
                    onChangeText={setHovaten}
                  />
                </View>

                {/* Số điện thoại */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Số điện thoại liên hệ khẩn cấp</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0912 345 678"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                    value={soDienThoai}
                    onChangeText={setSoDienThoai}
                  />
                </View>

                {/* Địa chỉ + Nút GPS */}
                <View style={styles.fieldGroup}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.fieldLabel}>Địa chỉ thường trú / Nơi ở</Text>
                    {/* NÚT LẤY ĐỊA CHỈ TỪ GPS THIẾT BỊ */}
                    <TouchableOpacity
                      style={styles.gpsAutoBtn}
                      onPress={handleGetGPSAddress}
                      disabled={gpsLoading}
                    >
                      {gpsLoading ? (
                        <ActivityIndicator size="small" color="#38BDF8" />
                      ) : (
                        <>
                          <Ionicons name="locate" size={13} color="#38BDF8" />
                          <Text style={styles.gpsAutoBtnText}>Lấy từ GPS thiết bị</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.input, { height: 64 }]}
                    multiline
                    numberOfLines={2}
                    placeholder="Bấm 'Lấy từ GPS thiết bị' để tự động định vị vị trí của bạn"
                    placeholderTextColor="#64748B"
                    value={diaChi}
                    onChangeText={setDiaChi}
                  />
                </View>

                {/* Save Profile Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="save" size={16} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>LƯU HỒ SƠ CÁ NHÂN</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Logout Button */}
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Đăng xuất khỏi thiết bị</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Auth Styles
  authContainer: {
    marginBottom: 16,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#161F33',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#DC2626',
  },
  tabSwitchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabSwitchTextActive: {
    color: '#FFFFFF',
  },

  authCard: {
    backgroundColor: '#161F33',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    marginBottom: 16,
  },
  authCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  authIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginBottom: 10,
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  authSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },

  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 13,
    color: '#FFFFFF',
  },
  eyeBtn: {
    padding: 8,
  },

  primaryActionBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  switchPromptBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  switchPromptText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  switchPromptHighlight: {
    color: '#EF4444',
    fontWeight: '700',
  },

  // Logged-in Profile Styles
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#161F33',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  avatarPlaceholderText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0F172A',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileHeroInfo: {
    flex: 1,
  },
  profileHeroName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileHeroEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },

  formCard: {
    backgroundColor: '#161F33',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  gpsAutoBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
