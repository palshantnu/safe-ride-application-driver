import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import { rechargeWallet, fetchRechargeHistory, fetchWithdrawalHistory, withdrawWallet } from '../../services/Services';
import { useSelector } from 'react-redux';

// Replace with your actual Razorpay key from dashboard
const RAZORPAY_KEY_ID = 'rzp_test_DUnz7sPsonIW95';

const WalletScreen = () => {

    const { userData, driverProfileData ,baProfile} = useSelector(
  (state) => state.auth
);


  const [balance, setBalance] = useState('0');
  const [history, setHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState('recharge');
  const [loading, setLoading] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('upi');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchRechargeHistory();
      const data = res?.data;
      if (data?.status) {
        setBalance(data.wallet_balance || '0');
        setHistory(data.data || []);
      }
    } catch (err) {
      console.log('recharge history error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadWithdrawalHistory = useCallback(async (silent = false) => {
    if (!silent) setWithdrawalLoading(true);
    try {
      const res = await fetchWithdrawalHistory();
      const data = res?.data;
      if (data?.status) {
        setWithdrawalHistory(data.data || []);
      }
    } catch (err) {
      console.log('withdrawal history error', err);
    } finally {
      setWithdrawalLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadWithdrawalHistory();
  }, [loadHistory, loadWithdrawalHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory(true);
    loadWithdrawalHistory(true);
  };

  const resetForm = () => {
    setAmount('');
    setRemarks('');
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount('');
    setWithdrawMethod('upi');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
    setAccountHolderName('');
    setUpiId('');
  };

  const submitRecharge = async (transactionId) => {
    try {
      const res = await rechargeWallet({
        amount: Number(amount),
        payment_mode: 'ONLINE',
        transaction_id: transactionId,
        remarks: remarks.trim(),
      });
      const data = res?.data;
      if (data?.status) {
        setModalVisible(false);
        resetForm();
        Alert.alert('Success', data.message || 'Wallet recharged successfully!');
        loadHistory();
      } else {
        Alert.alert('Failed', data?.message || 'Recharge failed. Please try again.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    setWithdrawSubmitting(true);

    try {
      const payload = {
        amount: Number(withdrawAmount),
      };

      if (withdrawMethod === 'upi') {
        if (!upiId?.trim()) {
          Alert.alert('Missing UPI ID', 'Please enter your UPI ID.');
          return;
        }
        payload.upi_id = upiId.trim();
      } else {
        if (!bankName?.trim() || !accountNumber?.trim() || !ifscCode?.trim() || !accountHolderName?.trim()) {
          Alert.alert('Missing Bank Details', 'Please fill all bank account details.');
          return;
        }
        payload.bank_name = bankName.trim();
        payload.account_number = accountNumber.trim();
        payload.ifsc_code = ifscCode.trim().toUpperCase();
        payload.account_holder_name = accountHolderName.trim();
      }

      const res = await withdrawWallet(payload);
      const data = res?.data;

      if (data?.status) {
        setWithdrawModalVisible(false);
        resetWithdrawForm();
        Alert.alert('Success', data.message || 'Withdrawal request submitted successfully.');
        loadHistory();
      } else {
        Alert.alert('Failed', data?.message || 'Withdrawal request failed.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const handleRecharge = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setSubmitting(true);

    const options = {
      description: remarks.trim() || 'Wallet Recharge',
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: String(Math.round(Number(amount) * 100)), // paise
      name: 'SIGIRIDE Captain',
       prefill: {
          name: userData?.name || '',
          contact: !userData?.ba_name ? userData?.phone : '',
          email: userData?.email || '',
        },
      theme: { color: '#810a45' },
    };

    RazorpayCheckout.open(options)
      .then((data) => {
        // data.razorpay_payment_id is the transaction ID
        submitRecharge(data.razorpay_payment_id);
      })
      .catch((error) => {
        setSubmitting(false);
        // error.code === 2 means user dismissed the payment sheet
        if (error?.code !== 2) {
          Alert.alert('Payment Failed', error?.description || 'Payment could not be completed.');
        }
      });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      '  ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const statusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED': return '#22c55e';
      case 'PENDING': return '#f59e0b';
      case 'FAILED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardIconWrap}>
          <Icon name="wallet-outline" size={20} color="#810a45" />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.rechargeId}>{item.recharge_id}</Text>
            <Text style={styles.amount}>+₹{parseFloat(item.amount).toFixed(2)}</Text>
          </View>
          <View style={styles.cardMidRow}>
            <Text style={styles.payMode}>{item.payment_mode}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(item.recharge_status) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor(item.recharge_status) }]}>
                {item.recharge_status}
              </Text>
            </View>
          </View>
          {item.transaction_id ? (
            <Text style={styles.txnId} numberOfLines={1}>TXN: {item.transaction_id}</Text>
          ) : null}
          {item.remarks ? <Text style={styles.remarks} numberOfLines={1}>{item.remarks}</Text> : null}
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </View>
  );

  const renderWithdrawalItem = ({ item }) => (
  <View style={styles.card}>
    <View style={styles.cardRow}>
      <View style={styles.cardIconWrap}>
        <Icon name="cash-outline" size={20} color="#f59e0b" />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.rechargeId}>
            Withdrawal Request
          </Text>

          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#ef4444',
            }}
          >
            -₹{parseFloat(item.amount || 0).toFixed(2)}
          </Text>
        </View>

        <Text style={styles.dateText}>
          {formatDate(item.created_at)}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusColor(item.status) + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColor(item.status) },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  </View>
);
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>My Wallet</Text>
      </LinearGradient>


      {/* Balance Card */}
      <LinearGradient
        colors={['#810a45', '#c0176b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{parseFloat(balance).toFixed(2)}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.rechargeBtn} onPress={() => setModalVisible(true)}>
            <Icon name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.rechargeBtnText}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.withdrawBtn} onPress={() => setWithdrawModalVisible(true)}>
            <Icon name="cash-outline" size={18} color="#fff" />
            <Text style={styles.withdrawBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
         <Text style={{...styles.balanceLabel,marginTop:15}}>​Keep at least ₹100 in your wallet to booking</Text>
      </LinearGradient>

      {/* History */}
     <View style={styles.historyTabContainer}>
  <TouchableOpacity
    style={[
      styles.historyTab,
      activeHistoryTab === 'recharge' && styles.historyTabActive,
    ]}
    onPress={() => setActiveHistoryTab('recharge')}
  >
    <Text
      style={[
        styles.historyTabText,
        activeHistoryTab === 'recharge' && styles.historyTabTextActive,
      ]}
    >
      Recharge History
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.historyTab,
      activeHistoryTab === 'withdrawal' && styles.historyTabActive,
    ]}
    onPress={() => setActiveHistoryTab('withdrawal')}
  >
    <Text
      style={[
        styles.historyTabText,
        activeHistoryTab === 'withdrawal' && styles.historyTabTextActive,
      ]}
    >
      Withdrawal History
    </Text>
  </TouchableOpacity>
</View>

      {loading ? (
        <ActivityIndicator size="large" color="#810a45" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
        data={
    activeHistoryTab === 'recharge'
      ? history
      : withdrawalHistory
  }
  keyExtractor={(item, index) =>
    String(item.id || item._id || index)
  }
  renderItem={({ item }) =>
    activeHistoryTab === 'recharge'
      ? renderItem({ item })
      : renderWithdrawalItem({ item })
  }
  contentContainerStyle={styles.listContent}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={['#810a45']}
    />
  }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="wallet-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No recharge history yet</Text>
            </View>
          }
        />
      )}

      {/* Withdraw Modal */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent onRequestClose={() => { if (!withdrawSubmitting) { setWithdrawModalVisible(false); resetWithdrawForm(); } }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Withdraw Money</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholderTextColor="#aaa"
                editable={!withdrawSubmitting}
              />

              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodChip, withdrawMethod === 'upi' && styles.methodChipActive]}
                  onPress={() => setWithdrawMethod('upi')}
                  disabled={withdrawSubmitting}
                >
                  <Text style={[styles.methodChipText, withdrawMethod === 'upi' && styles.methodChipTextActive]}>UPI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodChip, withdrawMethod === 'bank' && styles.methodChipActive]}
                  onPress={() => setWithdrawMethod('bank')}
                  disabled={withdrawSubmitting}
                >
                  <Text style={[styles.methodChipText, withdrawMethod === 'bank' && styles.methodChipTextActive]}>Bank Account</Text>
                </TouchableOpacity>
              </View>

              {withdrawMethod === 'upi' ? (
                <>
                  <Text style={styles.label}>UPI ID *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. gourav@paytm"
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholderTextColor="#aaa"
                    editable={!withdrawSubmitting}
                    autoCapitalize="none"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Bank Name *</Text>
                  <TextInput style={styles.input} placeholder="e.g. State Bank of India" value={bankName} onChangeText={setBankName} placeholderTextColor="#aaa" editable={!withdrawSubmitting} />
                  <Text style={styles.label}>Account Number *</Text>
                  <TextInput style={styles.input} placeholder="Enter account number" value={accountNumber} onChangeText={setAccountNumber} placeholderTextColor="#aaa" editable={!withdrawSubmitting} keyboardType="numeric" />
                  <Text style={styles.label}>IFSC Code *</Text>
                  <TextInput style={styles.input} placeholder="e.g. SBIN0001234" value={ifscCode} onChangeText={setIfscCode} placeholderTextColor="#aaa" editable={!withdrawSubmitting} autoCapitalize="characters" />
                  <Text style={styles.label}>Account Holder Name *</Text>
                  <TextInput style={styles.input} placeholder="Enter account holder name" value={accountHolderName} onChangeText={setAccountHolderName} placeholderTextColor="#aaa" editable={!withdrawSubmitting} autoCapitalize="words" />
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setWithdrawModalVisible(false); resetWithdrawForm(); }}
                  disabled={withdrawSubmitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, withdrawSubmitting && { opacity: 0.7 }]}
                  onPress={handleWithdrawRequest}
                  disabled={withdrawSubmitting}
                >
                  {withdrawSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Recharge Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => { if (!submitting) { setModalVisible(false); resetForm(); } }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Money to Wallet</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount */}
              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholderTextColor="#aaa"
                editable={!submitting}
              />

              {/* Remarks */}
              <Text style={styles.label}>Remarks (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="e.g. PhonePe se recharge"
                value={remarks}
                onChangeText={setRemarks}
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={3}
                editable={!submitting}
              />

              {/* Razorpay info */}
              <View style={styles.razorpayNote}>
                <Icon name="shield-checkmark-outline" size={14} color="#22c55e" />
                <Text style={styles.razorpayNoteText}>Secure payment powered by Razorpay</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setModalVisible(false); resetForm(); }}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleRecharge}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View style={styles.payBtnInner}>
                      <Icon name="card-outline" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>
                        Pay {amount ? `₹${amount}` : ''} via Razorpay
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },

  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 6 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '700', marginBottom: 16 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  rechargeBtn: {
    flexDirection: 'row',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 25,
      alignItems: 'center',
  },
  rechargeBtnText: {   color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,},
  withdrawBtn: {
   flexDirection: 'row',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 25,
      alignItems: 'center',
  },
  withdrawBtnText: {   color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,},

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rechargeId: { fontSize: 13, color: '#555', fontWeight: '500', flex: 1, marginRight: 8 },
  amount: { fontSize: 16, fontWeight: '700', color: '#22c55e' },
  cardMidRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  payMode: { fontSize: 12, color: '#888', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  txnId: { fontSize: 11, color: '#999', marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  remarks: { fontSize: 12, color: '#777', marginTop: 2 },
  dateText: { fontSize: 11, color: '#bbb', marginTop: 4 },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#aaa', marginTop: 12, fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  methodRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  methodChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  methodChipActive: {
    backgroundColor: '#810a45',
    borderColor: '#810a45',
  },
  methodChipText: { color: '#666', fontWeight: '600', fontSize: 13 },
  methodChipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },

  razorpayNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  razorpayNoteText: { fontSize: 12, color: '#16a34a', fontWeight: '500' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  submitBtn: {
    flex: 2,
    backgroundColor: '#810a45',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    historyTabContainer: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
      marginTop:10
    },
    historyTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    historyTabActive: {
      backgroundColor: '#FF1493',
    },
    historyTabText: {
      color: '#666',
      fontSize: 13,
      fontWeight: '600',
    },
    historyTabTextActive: {
      color: '#fff',
    },
});

export default WalletScreen;
