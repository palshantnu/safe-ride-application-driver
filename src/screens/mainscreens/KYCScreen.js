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
import { KYC_DOCUMENT, KYC_DOCUMENT_LIST, SUBMIT_KYC, BA_KYC_DOCUMENT, SUBMIT_BA_KYC } from '../../redux/actions/action-creator';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';

const API_BASE_URL = 'https://sigiride.com';
const IMAGE_BASE_URL = `${API_BASE_URL}/uploads/documents/`;

const KYCScreen = ({ navigation }) => {
    const { driverKycDocuments, driverKycDocumentsList, userData } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
  const loginToken = useSelector((state) => state?.auth?.loginToken);
    // Check if user is BA (Business Associate)
    const isBA = !!userData?.ba_name;
    
    console.log('Is BA User:', driverKycDocuments);
    console.log('UserData:', userData);

    // BA KYC States
    const [baKycData, setBaKycData] = useState(null);
    const [baKycStatus, setBaKycStatus] = useState(null);
    const [baKycLoading, setBaKycLoading] = useState(false);

    // BA Document Upload States
    const [aadharFront, setAadharFront] = useState(null);
    const [aadharBack, setAadharBack] = useState(null);
    const [panCard, setPanCard] = useState(null);
    const [gstNumber, setGstNumber] = useState('');
    // BA KYC extra fields
    const [aadharNumber, setAadharNumber] = useState('');
    const [panNumber, setPanNumber] = useState('');

    const [uploading, setUploading] = useState(false);

    // Driver KYC States (existing)
    const documents = driverKycDocuments || [];
    const [uploadedDocs, setUploadedDocs] = useState({});
    const [loading, setLoading] = useState(false);
    const [docUploading, setDocUploading] = useState({});

    // State for document details modal
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [documentNumber, setDocumentNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [remark, setRemark] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Store document details per document
    const [documentDetails, setDocumentDetails] = useState({});

    // Fetch BA KYC Data
    const fetchBaKyc = async () => {
        if (!isBA) return;
        
        setBaKycLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/ba/kyc`, {
                headers: {
                    Authorization: `Bearer ${loginToken}`,
                },
            });
            
            console.log('BA KYC Response:', response.data);
            
            if (response.data?.status && response.data?.data) {
                const kycData = response.data.data;
                setBaKycData(kycData);
                setBaKycStatus(kycData.status);
                
                // Set existing images if available
                if (kycData.aadhar_front_image) {
                    setAadharFront({
                        uri: `${IMAGE_BASE_URL}${kycData.aadhar_front_image}`,
                        isExisting: true,
                        path: kycData.aadhar_front_image
                    });
                }
                if (kycData.aadhar_back_image) {
                    setAadharBack({
                        uri: `${IMAGE_BASE_URL}${kycData.aadhar_back_image}`,
                        isExisting: true,
                        path: kycData.aadhar_back_image
                    });
                }
                if (kycData.pan_card_image) {
                    setPanCard({
                        uri: `${IMAGE_BASE_URL}${kycData.pan_card_image}`,
                        isExisting: true,
                        path: kycData.pan_card_image
                    });
                }
                if (kycData.gst_number) {
                    setGstNumber(kycData.gst_number);
                }
                if (kycData.pan_number) {
                    setPanNumber(kycData.pan_number);
                }
                if (kycData.aadhar_number) {
                    setAadharNumber(kycData.aadhar_number);
                }
            }
        } catch (error) {
            console.log('Error fetching BA KYC:', error);
        } finally {
            setBaKycLoading(false);
        }
    };

    useEffect(() => {
        if (isBA) {
            fetchBaKyc();
        } else {
            fetchDocuments();
            fetchDocumentsData();
        }
    }, [isBA]);

    // Populate existing data when driverKycDocumentsList is available
    useEffect(() => {
        if (!isBA && driverKycDocumentsList && driverKycDocumentsList.length > 0) {
            const existingData = {};
            const uploadedData = {};

            driverKycDocumentsList.forEach((existingDoc) => {
                const matchedDoc = documents.find(doc => String(doc.id) === String(existingDoc.document_type));

                if (matchedDoc) {
                    existingData[matchedDoc.id] = {
                        document_number: existingDoc.document_number || '',
                        expiry_date: existingDoc.expiry_date ? existingDoc.expiry_date : '',
                        remark: existingDoc.remark || '',
                        document_type: matchedDoc.document_type || existingDoc.document_type
                    };

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
                            isExisting: true
                        };
                    }
                }
            });

            setDocumentDetails(existingData);
            setUploadedDocs(uploadedData);
        }
    }, [driverKycDocumentsList, documents, isBA]);

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

    // ==================== BA KYC Functions ====================

    const showImagePickerForBA = (type) => {
        Alert.alert(
            'Upload Document',
            `Choose option to upload ${getBADocumentTitle(type)}`,
            [
                { text: 'Take Photo', onPress: () => openCameraForBA(type) },
                { text: 'Choose from Gallery', onPress: () => openGalleryForBA(type) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const openCameraForBA = async (type) => {
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
            if (response.assets && response.assets[0]) {
                handleBADocumentUpload(type, response.assets[0]);
            }
        });
    };

    const openGalleryForBA = async (type) => {
        // const hasPermission = await requestStoragePermission();
        // if (!hasPermission) {
        //     Alert.alert('Permission Denied', 'Storage permission is required to access gallery');
        //     return;
        // }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            quality: 0.8,
            selectionLimit: 1,
            maxWidth: 1024,
            maxHeight: 1024,
        };

        launchImageLibrary(options, (response) => {
            if (response.assets && response.assets[0]) {
                handleBADocumentUpload(type, response.assets[0]);
            }
        });
    };

    const handleBADocumentUpload = (type, file) => {
        const imageData = {
            uri: file.uri,
            name: file.fileName || `${type}_${Date.now()}.jpg`,
            type: file.type || 'image/jpeg',
            isExisting: false
        };

        switch (type) {
            case 'aadhar_front':
                setAadharFront(imageData);
                break;
            case 'aadhar_back':
                setAadharBack(imageData);
                break;
            case 'pan_card':
                setPanCard(imageData);
                break;
        }
    };

    const removeBADocument = (type) => {
        Alert.alert(
            'Remove Document',
            'Are you sure you want to remove this document?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    onPress: () => {
                        switch (type) {
                            case 'aadhar_front':
                                setAadharFront(null);
                                break;
                            case 'aadhar_back':
                                setAadharBack(null);
                                break;
                            case 'pan_card':
                                setPanCard(null);
                                break;
                        }
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    const getBADocumentTitle = (type) => {
        const titles = {
            'aadhar_front': 'Aadhar Card (Front)',
            'aadhar_back': 'Aadhar Card (Back)',
            'pan_card': 'PAN Card',
        };
        return titles[type] || type;
    };

    const getBAStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#4CAF50';
            case 'pending': return '#FF9800';
            case 'rejected': return '#F44336';
            default: return '#757575';
        }
    };

    const getBAStatusText = (status) => {
        switch (status) {
            case 'approved': return 'Approved';
            case 'pending': return 'Pending Verification';
            case 'rejected': return 'Rejected';
            default: return 'Not Submitted';
        }
    };

    const handleSubmitBAKYC = async () => {
        if (!aadharFront || !aadharBack || !panCard) {
            Alert.alert('Error', 'Please upload all required documents (Aadhar Front, Aadhar Back, PAN Card)');
            return;
        }

        // BA extra required inputs
        if (!aadharNumber.trim()) {
            Alert.alert('Error', 'Please enter Aadhar Number');
            return;
        }
        if (!panNumber.trim()) {
            Alert.alert('Error', 'Please enter PAN Number');
            return;
        }
        if (!gstNumber.trim()) {
            Alert.alert('Error', 'Please enter GST number');
            return;
        }


        setUploading(true);
        try {
            const formData = new FormData();
            
            // Append files only if they are new uploads (not existing)
            if (aadharFront && !aadharFront.isExisting) {
                formData.append('aadhar_front_image', {
                    uri: aadharFront.uri,
                    type: aadharFront.type,
                    name: aadharFront.name,
                });
            }
            
            if (aadharBack && !aadharBack.isExisting) {
                formData.append('aadhar_back_image', {
                    uri: aadharBack.uri,
                    type: aadharBack.type,
                    name: aadharBack.name,
                });
            }
            
            if (panCard && !panCard.isExisting) {
                formData.append('pan_card_image', {
                    uri: panCard.uri,
                    type: panCard.type,
                    name: panCard.name,
                });
            }
            
            formData.append('aadhar_number', aadharNumber);
            formData.append('pan_number', panNumber);
            formData.append('gst_number', gstNumber);

            console.log('Submitting BA KYC...');


            const response = await axios.post(`${API_BASE_URL}/api/ba/upload-kyc`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${loginToken}`,
                },
            });

            console.log('BA KYC Response:', response.data);

            if (response.data?.status) {
                Alert.alert(
                    'Success',
                    response.data?.message || 'KYC submitted successfully. Pending verification.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                await fetchBaKyc(); // Refresh data
            } else {
                Alert.alert('Error', response.data?.message || 'Failed to submit KYC');
            }
        } catch (error) {
            console.log('BA KYC Error:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
        } finally {
            setUploading(false);
        }
    };

    // ==================== Driver KYC Functions (Existing) ====================

    const getDocumentTypeKey = (documentType) => {
        const normalized = String(documentType || '').toLowerCase().trim();

        if (normalized.includes('vehicle_number') || normalized.includes('vehicle number')) {
            return 'vehicle_number';
        }

        if (normalized.includes('rc_book') || normalized.includes('rc book') || normalized.includes('rc')) {
            return 'rc_book';
        }

        if (['adhar_front', 'adhar_back', 'pan_card', 'vehicle_number', 'license', 'rc_book', 'insurance'].includes(normalized)) {
            return normalized;
        }

        const matchedDoc = documents.find(doc => String(doc.id) === String(documentType));
        return String(matchedDoc?.document_type || normalized).toLowerCase();
    };

    const requiresDocumentNumber = (documentType) => {
        const type = getDocumentTypeKey(documentType);
        return !['adhar_back'].includes(type);
    };

    const requiresExpiryDate = (documentType) => {
        const type = getDocumentTypeKey(documentType);
        return !['adhar_front', 'adhar_back', 'pan_card', 'vehicle_number', 'rc_book'].includes(type);
    };

    const showImagePickerOptions = (documentId, documentType) => {
        const details = documentDetails[documentId];
        const needsDocumentNumber = requiresDocumentNumber(documentType);
        const needsExpiryDate = requiresExpiryDate(documentType);

        const missingDocumentNumber = needsDocumentNumber && !details?.document_number;
        const missingExpiryDate = needsExpiryDate && !details?.expiry_date;

        if (missingDocumentNumber || missingExpiryDate) {
            const message = needsDocumentNumber && needsExpiryDate
                ? 'Please fill document number and expiry date before uploading'
                : needsDocumentNumber
                    ? 'Please fill document number before uploading'
                    : 'Please fill expiry date before uploading';

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
                { text: 'Take Photo', onPress: () => openDriverCamera(documentId, documentType) },
                { text: 'Choose from Gallery', onPress: () => openDriverGallery(documentId, documentType) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const openDriverCamera = async (documentId, documentType) => {
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
            if (response.assets && response.assets[0]) {
                handleDriverDocumentUpload(documentId, documentType, response.assets[0]);
            }
        });
    };

    const openDriverGallery = async (documentId, documentType) => {
        // const hasPermission = await requestStoragePermission();
        // if (!hasPermission) {
        //     Alert.alert('Permission Denied', 'Storage permission is required to access gallery');
        //     return;
        // }

        const options = {
            mediaType: 'photo',
            includeBase64: false,
            quality: 0.8,
            selectionLimit: 1,
            maxWidth: 1024,
            maxHeight: 1024,
        };

        launchImageLibrary(options, (response) => {
            if (response.assets && response.assets[0]) {
                handleDriverDocumentUpload(documentId, documentType, response.assets[0]);
            }
        });
    };

    const handleDriverDocumentUpload = async (documentId, documentType, file) => {
        setDocUploading(prev => ({ ...prev, [documentId]: true }));

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
                    isExisting: false
                }
            }));

            Alert.alert('Success', `${getDocumentTitle(documentType)} uploaded successfully`);
        } catch (error) {
            console.log('Upload error:', error);
            Alert.alert('Error', 'Failed to upload document');
        } finally {
            setDocUploading(prev => ({ ...prev, [documentId]: false }));
        }
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
        if (requiresDocumentNumber(selectedDoc?.type) && !documentNumber.trim()) {
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

    const getDocumentTitle = (documentType) => {
        const type = getDocumentTypeKey(documentType);
        const titles = {
            'license': 'Driving License',
            'adhar_front': 'Aadhar Card (Front)',
            'adhar_back': 'Aadhar Card (Back)',
            'pan_card': 'PAN Card',
            'rc_book': 'RC Book',
            'insurance': 'Insurance Document',
            'vehicle_number': 'Vehicle Number Pic',
        };
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

        if (!details) {
            return false;
        }

        const docType = getDocumentTypeKey(details?.document_type || documents.find(doc => String(doc.id) === String(docId))?.document_type || docId);

        if (requiresDocumentNumber(docType) && !details.document_number) {
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

    const renderDriverDocumentCard = (doc) => {
        const isUploaded = uploadedDocs[doc.id];
        const isUploading = docUploading[doc.id];
        const detailsFilled = isDocumentDetailsFilled(doc.id);
        const isComplete = isDocumentComplete(doc.id);
        const details = documentDetails[doc.id];
        const shouldShowDocumentNumber = requiresDocumentNumber(details?.document_type || doc.document_type);
        const shouldShowExpiryDate = requiresExpiryDate(details?.document_type || doc.document_type);

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
                        {shouldShowDocumentNumber && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Document No:</Text>
                                <Text style={styles.detailValue}>{details.document_number}</Text>
                            </View>
                        )}
                        {shouldShowExpiryDate && (
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
                        <Image
                            source={{ uri: isUploaded.uri?.replace('http://localhost:3000', API_BASE_URL) }}
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

    const handleDriverSubmitKYC = async () => {
        const totalDocuments = documents.length;
        let completedCount = 0;

        documents.forEach(doc => {
            if (isDocumentComplete(doc.id)) {
                completedCount++;
            }
        });

        const formData = new FormData();
        formData.append('driver_id', userData?.id);

        documents.forEach((doc, index) => {
            const uploadedFile = uploadedDocs[doc.id];
            const details = documentDetails[doc.id];

            if (uploadedFile && details) {
                formData.append(`documents[${index}][document_type]`, doc.id);
                formData.append(`documents[${index}][document_number]`, details.document_number);
                formData.append(`documents[${index}][expiry_date]`, details.expiry_date);
                formData.append(`documents[${index}][remark]`, details.remark || '');

                if (!uploadedFile.isExisting) {
                    formData.append(`document_files[${index}]`, {
                        uri: uploadedFile.uri,
                        type: uploadedFile.type || 'image/jpeg',
                        name: uploadedFile.name || `doc_${index}.jpg`,
                    });
                }
            }
        });

        try {
            setLoading(true);
            const response = await dispatch(SUBMIT_KYC(formData));
            Alert.alert('Success', response?.message || 'KYC submitted successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (error) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to submit KYC');
        } finally {
            setLoading(false);
        }
    };

    // ==================== BA KYC Render Component ====================

    const renderBAKYCScreen = () => {
        if (baKycLoading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FF1493" />
                </View>
            );
        }

        const isVerified = baKycStatus === 'approved';
        const isPending = baKycStatus === 'pending';
        const canEdit = !isVerified;

        return (
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <BackHeader title="BA KYC Verification" navigation={navigation} />

                <View style={styles.kycIntroHeader}>
                    <Text style={styles.kycIntroHeaderTitle}>Business Associate KYC</Text>
                    <Text style={styles.headerSubtitle}>
                        Please upload the following documents to complete your KYC verification
                    </Text>
                </View>

                {/* Status Card */}
                {baKycStatus && (
                    <View style={[styles.statusCard, { backgroundColor: getBAStatusColor(baKycStatus) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getBAStatusColor(baKycStatus) }]} />
                        <Text style={[styles.statusText, { color: getBAStatusColor(baKycStatus) }]}>
                            Status: {getBAStatusText(baKycStatus)}
                        </Text>
                    </View>
                )}

                <View style={styles.documentsContainer}>
                    {/* Aadhar Front */}
                    <View style={styles.baDocumentCard}>
                        <Text style={styles.baDocumentTitle}>Aadhar Card (Front) *</Text>
                        {aadharFront ? (
                            <View style={styles.baPreviewContainer}>
                                <Image source={{ uri: aadharFront.uri }} style={styles.baPreviewImage} />
                                {canEdit && (
                                    <View style={styles.baButtonRow}>
                                        <TouchableOpacity
                                            style={[styles.baButton, styles.baChangeButton]}
                                            onPress={() => showImagePickerForBA('aadhar_front')}
                                        >
                                            <Icon name="edit-2" size={16} color="#fff" />
                                            <Text style={styles.baButtonText}>Change</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.baButton, styles.baRemoveButton]}
                                            onPress={() => removeBADocument('aadhar_front')}
                                        >
                                            <Icon name="trash-2" size={16} color="#fff" />
                                            <Text style={styles.baButtonText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.baUploadButton}
                                onPress={() => showImagePickerForBA('aadhar_front')}
                                disabled={!canEdit}
                            >
                                <Icon name="upload-cloud" size={24} color="#FF1493" />
                                <Text style={styles.baUploadText}>Upload Aadhar Front</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Aadhar Back */}
                    <View style={styles.baDocumentCard}>
                        <Text style={styles.baDocumentTitle}>Aadhar Card (Back) *</Text>
                        {aadharBack ? (
                            <View style={styles.baPreviewContainer}>
                                <Image source={{ uri: aadharBack.uri }} style={styles.baPreviewImage} />
                                {canEdit && (
                                    <View style={styles.baButtonRow}>
                                        <TouchableOpacity
                                            style={[styles.baButton, styles.baChangeButton]}
                                            onPress={() => showImagePickerForBA('aadhar_back')}
                                        >
                                            <Icon name="edit-2" size={16} color="#fff" />
                                            <Text style={styles.baButtonText}>Change</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.baButton, styles.baRemoveButton]}
                                            onPress={() => removeBADocument('aadhar_back')}
                                        >
                                            <Icon name="trash-2" size={16} color="#fff" />
                                            <Text style={styles.baButtonText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.baUploadButton}
                                onPress={() => showImagePickerForBA('aadhar_back')}
                                disabled={!canEdit}
                            >
                                <Icon name="upload-cloud" size={24} color="#FF1493" />
                                <Text style={styles.baUploadText}>Upload Aadhar Back</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* PAN Card */}
                    <View style={styles.baDocumentCard}>
                        <Text style={styles.baDocumentTitle}>PAN Card *</Text>
                        {panCard ? (
                            <View style={styles.baPreviewContainer}>
                                <Image source={{ uri: panCard.uri }} style={styles.baPreviewImage} />
                                {canEdit && (
                                    <View style={styles.baButtonRow}>
                                        <TouchableOpacity
                                            style={[styles.baButton, styles.baChangeButton]}
                                            onPress={() => showImagePickerForBA('pan_card')}
                                        >
                                            <Icon name="edit-2" size={16} color="#fff" />
                                            <Text style={styles.baButtonText}>Change</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.baButton, styles.baRemoveButton]}
                                            onPress={() => removeBADocument('pan_card')}
                                        >
                                            <Icon name="trash-2" size={16} color="#fff" />
                                            <Text style={styles.baButtonText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.baUploadButton}
                                onPress={() => showImagePickerForBA('pan_card')}
                                disabled={!canEdit}
                            >
                                <Icon name="upload-cloud" size={24} color="#FF1493" />
                                <Text style={styles.baUploadText}>Upload PAN Card</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Aadhar Number */}
                    <View style={styles.baDocumentCard}>
                        <Text style={styles.baDocumentTitle}>Aadhar Number *</Text>
                        <TextInput
                            style={[styles.textInput, !canEdit && styles.disabledInput]}
                            placeholder="Enter Aadhar Number"
                            placeholderTextColor="#999"
                            value={aadharNumber}
                            onChangeText={setAadharNumber}
                            editable={canEdit}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* PAN Number */}
                    <View style={styles.baDocumentCard}>
                        <Text style={styles.baDocumentTitle}>PAN Number *</Text>
                        <TextInput
                            style={[styles.textInput, !canEdit && styles.disabledInput]}
                            placeholder="Enter PAN Number"
                            placeholderTextColor="#999"
                            value={panNumber}
                            onChangeText={setPanNumber}
                            editable={canEdit}
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* GST Number */}
                    <View style={styles.baDocumentCard}>
                        <Text style={styles.baDocumentTitle}>GST Number *</Text>
                        <TextInput
                            style={[styles.textInput, !canEdit && styles.disabledInput]}
                            placeholder="Enter GST Number"
                            placeholderTextColor="#999"
                            value={gstNumber}
                            onChangeText={setGstNumber}
                            editable={canEdit}
                            keyboardType="default"
                        />
                    </View>

                </View>

                <View style={styles.infoBox}>
                    <Icon name="info" size={20} color="#FF1493" />
                    <Text style={styles.infoText}>
                        Make sure all documents are clear and readable.
                        Accepted formats: JPG, PNG (Max size: 5MB)
                    </Text>
                </View>

                {canEdit && (
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmitBAKYC}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {baKycData ? 'Update KYC' : 'Submit KYC'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {isVerified && (
                    <View style={styles.verifiedContainer}>
                        <Icon name="check-circle" size={24} color="#4CAF50" />
                        <Text style={styles.verifiedText}>Your KYC has been verified successfully!</Text>
                    </View>
                )}

                <View style={styles.footer} />
            </ScrollView>
        );
    };

    // ==================== Driver KYC Render Component ====================

    const renderDriverKYCScreen = () => {
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
                    {documents.map(renderDriverDocumentCard)}
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
                    onPress={handleDriverSubmitKYC}
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
                                {requiresDocumentNumber(selectedDoc?.type) && (
                                    <>
                                        <Text style={styles.inputLabel}>Document Number *</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter document number"
                                            placeholderTextColor="#999"
                                            value={documentNumber}
                                            onChangeText={setDocumentNumber}
                                        />
                                    </>
                                )}

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
                                )}

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
                                    placeholderTextColor="#999"
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

    const BackHeader = ({ title, navigation }) => {
        return (
            <LinearGradient
                colors={['#ff7f50', '#ff7f50', '#e20f7a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topHeader}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.topHeaderTitle}>{title}</Text>
                <View style={{ width: 30 }} />
            </LinearGradient>
        );
    };

    // Render based on user type
    return isBA ? renderBAKYCScreen() : renderDriverKYCScreen();
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
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
        gap: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
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
    // BA Specific Styles
    baDocumentCard: {
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
    baDocumentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    baUploadButton: {
        borderWidth: 1,
        borderColor: '#FF1493',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF0F6',
    },
    baUploadText: {
        fontSize: 14,
        color: '#FF1493',
        fontWeight: '500',
    },
    baPreviewContainer: {
        alignItems: 'center',
    },
    baPreviewImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        resizeMode: 'cover',
        marginBottom: 12,
    },
    baButtonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    baButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 6,
        gap: 6,
    },
    baChangeButton: {
        backgroundColor: '#2196F3',
    },
    baRemoveButton: {
        backgroundColor: '#F44336',
    },
    baButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    disabledInput: {
        backgroundColor: '#f5f5f5',
        color: '#999',
    },
    verifiedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F5E9',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    verifiedText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '500',
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
        width: '70%',
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
    dateText: {
        fontSize: 14,
        color: '#333',
    },
    placeholderText: {
        color: '#999',
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
});

export default KYCScreen;