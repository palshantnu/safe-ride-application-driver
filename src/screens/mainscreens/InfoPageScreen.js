import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHTML from 'react-native-render-html';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

const InfoPageScreen = ({ route, navigation }) => {
  const { page } = route.params || {};
  const { width } = useWindowDimensions();
  const title = page?.title
    ? page.title.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Page';
  const content = page?.content || '<p>No content available</p>';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <RenderHTML
          contentWidth={width - 32}
          source={{ html: content }}
          tagsStyles={htmlStyles}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bodyContent: {
    paddingVertical: 16,
  },
});

const htmlStyles = {
  body: {
    color: '#333',
    fontSize: 16,
    lineHeight: 24,
  },
  p: {
    marginBottom: 12,
  },
  b: {
    fontWeight: '700',
  },
};

export default InfoPageScreen;
