import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing, TouchableHighlight } from 'react-native';

type Props = {
    onAdd?: () => void;
    onList?: () => void;
};

export default function ButtonAddPlus({ onAdd, onList }: Props) {
    const [menuVisible, setMenuVisible] = useState(false);
    const animation = useRef(new Animated.Value(0)).current;

    const showMenu = () => {
        setMenuVisible(true);
        Animated.timing(animation, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    };

    const hideMenu = () => {
        Animated.timing(animation, {
            toValue: 0,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
        }).start(() => setMenuVisible(false));
    };

    const handleFabPress = () => {
        if (menuVisible) {
            hideMenu();
        } else {
            showMenu();
        }
    };

    const handleAdd = () => {
        hideMenu();
        onAdd && onAdd();
    };

    const handleList = () => {
        hideMenu();
        onList && onList();
    };

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
    });
    const opacity = animation;

    return (
        <View style={styles.container} pointerEvents="box-none">
            {menuVisible && (
                <Animated.View
                    style={[
                        styles.menu,
                        {
                            opacity,
                            transform: [{ translateY }],
                            position: 'absolute',
                            bottom: 60,
                            right: 10,
                        },
                    ]}
                >
                    <TouchableHighlight
                        style={styles.menuItem}
                        underlayColor="#e0f7fa"
                        onPress={handleList}
                    >
                        <Text style={styles.menuText} numberOfLines={1} ellipsizeMode="tail">
                            Ver Propriedades
                        </Text>
                    </TouchableHighlight>
                </Animated.View>
            )}
            <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.8}>
                <Text style={styles.plus}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 10,
        bottom: 82,
        alignItems: 'center',
        zIndex: 20,
    },
    fab: {
        width: 50,
        height: 50,
        borderRadius: 28,
        backgroundColor: '#00D4FF', // Changed to match app's accent color
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    plus: {
        color: '#fff',
        fontSize: 32,
        lineHeight: 36,
    },
    menu: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingVertical: 8,
        marginTop: 8,
        minWidth: 220,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        flexShrink: 1,
    },
});
