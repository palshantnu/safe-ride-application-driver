// screens/mainscreens/KYCScreen.js

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
    PermissionsAndroid,
    TextInput,
    Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { KYC_DOCUMENT, KYC_DOCUMENT_LIST, SUBMIT_KYC } from '../../redux/actions/action-creator';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';

const KYCScreen = ({ navigation }) => {
    const { driverKycDocuments, driverKycDocumentsList } = useSelector((state) => state.auth);

    console.log('driverKycDocuments', driverKycDocuments);
    const [documents, setDocuments] = useState(driverKycDocuments || []);
    const [uploadedDocs, setUploadedDocs] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState({});

    // State for document details modal
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [documentNumber, setDocumentNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [remark, setRemark] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Store document details per document
    const [documentDetails, setDocumentDetails] = useState({});

    const { userData } = useSelector((state) => state.auth);

    useEffect(() => {
        fetchDocuments();
        fetchDocumentsData();
    }, []);

    // Populate existing data when driverKycDocumentsList is available
    useEffect(() => {
        if (driverKycDocumentsList && driverKycDocumentsList.length > 0) {
            const existingData = {};
            const uploadedData = {};

            driverKycDocumentsList.forEach((existingDoc) => {
                // Find matching document from the required documents list
                const matchedDoc = documents.find(doc => String(doc.id) === String(existingDoc.document_type));

                if (matchedDoc) {
                    // Store document details
                    existingData[matchedDoc.id] = {
                        document_number: existingDoc.document_number || '',
                        expiry_date: existingDoc.expiry_date ? existingDoc.expiry_date : '',
                        remark: existingDoc.remark || '',
                        document_type: matchedDoc.document_type || existingDoc.document_type
                    };

                    // Store uploaded file info
                    if (existingDoc.document_file_url) {
                        uploadedData[matchedDoc.id] = {
                            uri: existingDoc.document_file_url,
                            name: existingDoc.document_file,
                            type: 'image/jpeg',
                            uploaded: true,
                            document_number: existingDoc.document_number || '',
                            expiry_date: existingDoc.expiry_date ? new Date(existingDoc.expiry_date).toLocaleDateString('en-GB') : '',
                            remark: existingDoc.remark || '',
                            document_type: matchedDoc.document_type || existingDoc.document_type,
                            isExisting: true // Flag to indicate this is an existing uploaded file
                        };
                    }
                }
            });

            setDocumentDetails(existingData);
            setUploadedDocs(uploadedData);
        }
    }, [driverKycDocumentsList, documents]);

    const dispatch = useDispatch();

  

    const fetchDocuments = async () => {
        await dispatch(KYC_DOCUMENT());
    };

    const fetchDocumentsData = async () => {
        await dispatch(KYC_DOCUMENT_LIST());
    };

    const requestCameraPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: 'Camera Permission',
                        message: 'App needs access to your camera to capture documents',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.log('Camera permission error:', err);
                return false;
            }
        }
        return true;
    };

    const requestStoragePermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    {
                        title: 'Storage Permission',
                        message: 'App needs access to your storage to upload documents',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.log('Storage permission error:', err);
                return false;
            }
        }
        return true;
    };

    const getDocumentTypeKey = (documentType) => {
        const normalized = String(documentType || '').toLowerCase().trim();

        if (['adhar_front', 'adhar_back', 'pan_card', 'vehicle_number', 'license', 'rc_book', 'insurance'].includes(normalized)) {
            return normalized;
        }

        const matchedDoc = documents.find(doc => String(doc.id) === String(documentType));
        return String(matchedDoc?.document_type || normalized).toLowerCase();
    };

    const requiresExpiryDate = (documentType) => {
        const type = getDocumentTypeKey(documentType);
        return !['adhar_front', 'adhar_back', 'pan_card', 'vehicle_number'].includes(type);
    };

    const showImagePickerOptions = (documentId, documentType) => {
        // First check if document details are filled
        const details = documentDetails[documentId];
        const hasRequiredExpiry = requiresExpiryDate(documentType) ? !!details?.expiry_date : true;

        if (!details || !details.document_number || !hasRequiredExpiry) {
            const message = requiresExpiryDate(documentType)
                ? 'Please fill document number and expiry date before uploading'
                : 'Please fill document number before uploading';

            Alert.alert(
                'Fill Document Details',
                message,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Fill Details', onPress: () => openDetailsModal(documentId, documentType) }
                ]
            );
            return;
        }

        Alert.alert(
            'Upload Document',
            `Choose option to upload ${getDocumentTitle(documentType)}`,
            [
                {
                    text: 'Take Photo',
                    onPress: () => openCamera(documentId, documentType),
                },
                {
                    text: 'Choose from Gallery',
                    onPress: () => openGallery(documentId, documentType),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    const openDetailsModal = (documentId, documentType) => {
        const existingDetails = documentDetails[documentId] || {};
        setSelectedDoc({ id: documentId, type: documentType });
        setDocumentNumber(existingDetails.document_number || '');
        setExpiryDate(existingDetails.expiry_date || '');
        setRemark(existingDetails.remark || '');
        setShowDetailsModal(true);
    };

    const saveDocumentDetails = () => {
        if (!documentNumber.trim()) {
            Alert.alert('Error', 'Please enter document number');
            return;
        }

        if (requiresExpiryDate(selectedDoc?.type) && !expiryDate.trim()) {
            Alert.alert('Error', 'Please select expiry date');
            return;
        }

        setDocumentDetails(prev => ({
            ...prev,
            [selectedDoc.id]: {
                document_number: documentNumber,
                expiry_date: expiryDate,
                remark: remark || '',
                document_type: selectedDoc.type
            }
        }));

        setShowDetailsModal(false);
        setSelectedDoc(null);
        setDocumentNumber('');
        setExpiryDate('');
        setRemark('');
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formattedDate = selectedDate.toLocaleDateString('en-GB');
            setExpiryDate(formattedDate);
        }
    };

    const openCamera = async (documentId, documentType) => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Camera permission is required to capture photos');
            return;
        }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            quality: 0.8,
            saveToPhotos: true,
            maxWidth: 1024,
            maxHeight: 1024,
        };

        launchCamera(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled camera');
            } else if (response.error) {
                console.log('Camera Error: ', response.error);
                Alert.alert('Error', 'Failed to capture image');
            } else if (response.assets && response.assets[0]) {
                handleDocumentUpload(documentId, documentType, response.assets[0]);
            }
        });
    };

    const openGallery = async (documentId, documentType) => {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Storage permission is required to access gallery');
            return;
        }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            quality: 0.8,
            selectionLimit: 1,
            maxWidth: 1024,
            maxHeight: 1024,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled gallery');
            } else if (response.error) {
                console.log('Gallery Error: ', response.error);
                Alert.alert('Error', 'Failed to select image');
            } else if (response.assets && response.assets[0]) {
                handleDocumentUpload(documentId, documentType, response.assets[0]);
            }
        });
    };

    const handleDocumentUpload = async (documentId, documentType, file) => {
        setUploading(prev => ({ ...prev, [documentId]: true }));

        try {
            const details = documentDetails[documentId];

            setUploadedDocs(prev => ({
                ...prev,
                [documentId]: {
                    uri: file.uri,
                    name: file.fileName,
                    type: file.type,
                    uploaded: true,
                    document_number: details?.document_number || '',
                    expiry_date: details?.expiry_date || '',
                    remark: details?.remark || '',
                    isExisting: false // This is a new upload
                }
            }));

            Alert.alert('Success', `${getDocumentTitle(documentType)} uploaded successfully`);
        } catch (error) {
            console.log('Upload error:', error);
            Alert.alert('Error', 'Failed to upload document');
        } finally {
            setUploading(prev => ({ ...prev, [documentId]: false }));
        }
    };

    const getDocumentTitle = (documentType) => {
        const type = getDocumentTypeKey(documentType);
        const titles = {
            'license': 'Driving License',
            'adhar_front': 'Aadhar Card (Front)',
            'adhar_back': 'Aadhar Card (Back)',
            'pan_card': 'PAN Card',
            'rc_book': 'RC Book',
            'insurance': 'Insurance Document',
            'vehicle_number': 'Vehicle Number',
        };
        // If documentType is a number/id, try to find from driverKycDocuments
        return titles[type] || type.replace('_', ' ').toUpperCase();
    };

    const getDocumentIcon = (documentType) => {
        const type = getDocumentTypeKey(documentType);
        const icons = {
            'license': 'credit-card',
            'adhar_front': 'file-text',
            'adhar_back': 'file-text',
            'pan_card': 'file',
            'rc_book': 'book',
            'insurance': 'shield',
            'vehicle_number': 'truck',
        };
        return icons[type] || 'file';
    };

    const isDocumentDetailsFilled = (docId) => {
        const details = documentDetails[docId];
        const docType = getDocumentTypeKey(details?.document_type || documents.find(doc => String(doc.id) === String(docId))?.id);

        if (!details || !details.document_number) {
            return false;
        }

        return requiresExpiryDate(docType) ? !!details.expiry_date : true;
    };

    const isDocumentUploaded = (docId) => {
        return uploadedDocs[docId];
    };

    const isDocumentComplete = (docId) => {
        return isDocumentDetailsFilled(docId) && isDocumentUploaded(docId);
    };

    const renderDocumentCard = (doc) => {
        const isUploaded = uploadedDocs[doc.id];
        const isUploading = uploading[doc.id];
        const detailsFilled = isDocumentDetailsFilled(doc.id);
        const isComplete = isDocumentComplete(doc.id);
        const details = documentDetails[doc.id];

        return (
            <View key={doc.id} style={[styles.documentCard, isComplete && styles.completeCard]}>
                <View style={styles.documentHeader}>
                    <View style={styles.documentIconContainer}>
                        <Icon name={getDocumentIcon(doc.document_type)} size={24} color="#FF1493" />
                    </View>
                    <View style={styles.documentInfo}>
                        <Text style={styles.documentTitle}>{getDocumentTitle(doc.document_type)}</Text>
                        <Text style={[styles.documentStatus, detailsFilled && styles.documentStatusUploaded]}>
                            {detailsFilled ? '✓ Details filled' : '⚠️ Details pending'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.detailsButton}
                        onPress={() => openDetailsModal(doc.id, doc.document_type)}
                    >
                        <Icon name="edit-2" size={18} color="#FF1493" />
                    </TouchableOpacity>
                </View>

                {detailsFilled && (
                    <View style={styles.detailsPreview}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Document No:</Text>
                            <Text style={styles.detailValue}>{details.document_number}</Text>
                        </View>
                        {requiresExpiryDate(details.document_type) && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Expiry Date:</Text>
                                <Text style={styles.detailValue}>{details.expiry_date || 'Not required'}</Text>
                            </View>
                        )}
                        {details.remark ? (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Remark:</Text>
                                <Text style={styles.detailValue}>{details.remark}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                {isUploaded && (
                    <View style={styles.uploadedPreview}>
                        {console.log('isUploaded.uri ', isUploaded.uri)
                        }
                        <Image
                            source={{
                                uri: isUploaded.uri.replace(
                                    'http://localhost:3000',
                                    'http://91.108.104.79:3000'
                                )
                            }}
                            style={styles.previewImage}
                        />
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => {
                                Alert.alert(
                                    'Remove Document',
                                    'Are you sure you want to remove this document?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Remove',
                                            onPress: () => {
                                                setUploadedDocs(prev => {
                                                    const newDocs = { ...prev };
                                                    delete newDocs[doc.id];
                                                    return newDocs;
                                                });
                                            },
                                            style: 'destructive'
                                        }
                                    ]
                                );
                            }}
                        >
                            <Icon name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.uploadButton,
                        isUploaded && styles.uploadedButton,
                        !detailsFilled && styles.uploadButtonDisabled
                    ]}
                    onPress={() => showImagePickerOptions(doc.id, doc.document_type)}
                    disabled={isUploading || !detailsFilled}
                >
                    {isUploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Icon name={isUploaded ? "check-circle" : "upload-cloud"} size={20} color="#fff" />
                            <Text style={styles.uploadButtonText}>
                                {isUploaded ? (isUploaded.isExisting ? 'Replace Document' : 'Re-upload') : 'Upload Document'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const handleSubmitKYC = async () => {
        const totalDocuments = documents.length;
        let completedCount = 0;

        // Check each document has details and file
        documents.forEach(doc => {
            if (isDocumentComplete(doc.id)) {
                completedCount++;
            }
        });

        const formData = new FormData();

        // driver_id
        formData.append('driver_id', userData?.id);

        documents.forEach((doc, index) => {
            const uploadedFile = uploadedDocs[doc.id];
            const details = documentDetails[doc.id];

            if (uploadedFile && details) {
                // documents array fields
                formData.append(`documents[${index}][document_type]`, doc.id);
                formData.append(`documents[${index}][document_number]`, details.document_number);
                formData.append(`documents[${index}][expiry_date]`, details.expiry_date);
                formData.append(`documents[${index}][remark]`, details.remark || '');

                // Only append file if it's a new upload (not existing from server)
                if (!uploadedFile.isExisting) {
                    formData.append(`document_files[${index}]`, {
                        uri: uploadedFile.uri,
                        type: uploadedFile.type || 'image/jpeg',
                        name: uploadedFile.name || `doc_${index}.jpg`,
                    });
                }
            }
        });

        console.log('formData', formData);

        try {
            setLoading(true);

            const response = await dispatch(SUBMIT_KYC(formData));

            Alert.alert(
                'Success',
                response?.message || 'KYC submitted successfully',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );

        } catch (error) {
            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Failed to submit KYC'
            );
        } finally {
            setLoading(false);
        }
    };

    const BackHeader = ({ title, navigation }) => {
      return (
       <LinearGradient
            colors={['#ff7f50', '#ff7f50', '#e20f7a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topHeader}
          >
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
    
          <Text style={styles.topHeaderTitle}>{title}</Text>
    
          {/* Right side empty space for perfect center alignment */}
          <View style={{ width: 30 }} />
        </LinearGradient>
      );
    };

    if (loading && documents.length === 0) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#FF1493" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
               <BackHeader title="KYC Verification" navigation={navigation} />
            <View style={styles.kycIntroHeader}>
                <Text style={styles.kycIntroHeaderTitle}>KYC Verification</Text>
                <Text style={styles.headerSubtitle}>
                    Please fill document details and upload the following documents to complete your KYC verification
                </Text>
            </View>

            <View style={styles.documentsContainer}>
                {documents.map(renderDocumentCard)}
            </View>

            <View style={styles.infoBox}>
                <Icon name="info" size={20} color="#FF1493" />
                <Text style={styles.infoText}>
                    Make sure all documents are clear and readable.
                    Accepted formats: JPG, PNG (Max size: 5MB)
                </Text>
            </View>

            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitKYC}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.submitButtonText}>Submit KYC</Text>
                )}
            </TouchableOpacity>

            {/* Document Details Modal */}
            <Modal
                visible={showDetailsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowDetailsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Document Details - {selectedDoc ? getDocumentTitle(selectedDoc.type) : ''}
                            </Text>
                            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                                <Icon name="x" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Document Number *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter document number"
                                placeholderTextColor="#000"
                                value={documentNumber}
                                onChangeText={setDocumentNumber}
                            />

                            {requiresExpiryDate(selectedDoc?.type) && (
                                <>
                                    <Text style={styles.inputLabel}>Expiry Date *</Text>
                                    <TouchableOpacity
                                        style={styles.dateInput}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={[styles.dateText, !expiryDate && styles.placeholderText]}>
                                            {expiryDate || 'Select expiry date'}
                                        </Text>
                                        <Icon name="calendar" size={20} color="#999" />
                                    </TouchableOpacity>
                                </>
                            ) }

                            {showDatePicker && (
                                <DateTimePicker
                                    value={new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}

                            <Text style={styles.inputLabel}>Remark (Optional)</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                placeholder="Enter any remarks"
                                placeholderTextColor="#000"
                                value={remark}
                                onChangeText={setRemark}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowDetailsModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={saveDocumentDetails}
                            >
                                <Text style={styles.saveButtonText}>Save Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.footer} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    kycIntroHeader: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    kycIntroHeaderTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    documentsContainer: {
        padding: 16,
    },
    documentCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    completeCard: {
        borderWidth: 1,
        borderColor: '#28a745',
    },
    documentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    documentIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFF0F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    documentInfo: {
        flex: 1,
    },
    documentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    documentStatus: {
        fontSize: 13,
        color: '#999',
    },
    documentStatusUploaded: {
        color: '#28a745',
    },
    detailsButton: {
        padding: 8,
    },
    detailsPreview: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    detailLabel: {
        width: 100,
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    detailValue: {
        flex: 1,
        fontSize: 12,
        color: '#333',
    },
    uploadedPreview: {
        position: 'relative',
        marginBottom: 16,
    },
    previewImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF1493',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    uploadButtonDisabled: {
        backgroundColor: '#ccc',
    },
    uploadedButton: {
        backgroundColor: '#28a745',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#FFF0F6',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        gap: 8,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
    submitButton: {
        backgroundColor: '#FF1493',
        marginHorizontal: 16,
        marginVertical: 16,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#FF1493',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        height: 30,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    modalBody: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
        marginTop: 12,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
    },
    optionalNoteBox: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#FFF0F6',
    },
    optionalNoteText: {
        fontSize: 12,
        color: '#7A1F5A',
    },
    dateText: {
        fontSize: 14,
        color: '#333',
    },
    placeholderText: {
        color: '#000',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#FF1493',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    topHeader: {
  height: 60,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 4,
  borderBottomLeftRadius: 40,
  borderBottomRightRadius: 40,
},

topHeaderTitle: {
  fontSize: 20,
  fontWeight: '600',
  color: '#ffffff',
},

backBtn: {
  position: 'absolute',
  left: 16,
},
});

export default KYCScreen;
