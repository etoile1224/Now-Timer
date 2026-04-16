import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, PanResponder, StyleSheet } from 'react-native';
import { colors } from '@/lib/colors';

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (val: number) => void;
}

export function NumberInput({ label, value, min, max, unit = 'min', onChange }: NumberInputProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(String(value));
  const accumulatedDelta = useRef(0);
  const currentValue = useRef(value);

  useEffect(() => {
    currentValue.current = value;
    if (!editing) setEditText(String(value));
  }, [value, editing]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        accumulatedDelta.current = 0;
      },
      onPanResponderMove: (_, gs) => {
        const steps = Math.round(-gs.dy / 12);
        const diff = steps - accumulatedDelta.current;
        if (diff !== 0) {
          accumulatedDelta.current = steps;
          const next = Math.min(max, Math.max(min, currentValue.current + diff));
          if (next !== currentValue.current) {
            currentValue.current = next;
            onChange(next);
          }
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dy) < 5 && Math.abs(gs.dx) < 5) {
          setEditing(true);
          setEditText(String(currentValue.current));
        }
      },
    }),
  ).current;

  const commitEdit = () => {
    setEditing(false);
    const num = parseInt(editText, 10);
    if (!isNaN(num)) {
      onChange(Math.min(max, Math.max(min, num)));
    }
  };

  return (
    <View style={numStyles.row}>
      <Text style={numStyles.label}>{label}</Text>
      <View style={numStyles.controls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          style={numStyles.button}
          activeOpacity={0.7}
        >
          <Text style={numStyles.buttonText}>{'\u2212'}</Text>
        </TouchableOpacity>
        {editing ? (
          <View style={[numStyles.valueBox, numStyles.valueBoxEditing]}>
            <TextInput
              style={numStyles.valueInput}
              value={editText}
              onChangeText={setEditText}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              returnKeyType="done"
            />
          </View>
        ) : (
          <View style={numStyles.valueBox} {...panResponder.panHandlers}>
            <Text style={numStyles.valueText}>{value}</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          style={numStyles.button}
          activeOpacity={0.7}
        >
          <Text style={numStyles.buttonText}>+</Text>
        </TouchableOpacity>
        <Text style={numStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

export const numStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 16,
    fontFamily: 'KotraGothic',
    color: colors.foreground,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 20,
    fontFamily: 'KotraBold',
    color: colors.tomato,
  },
  valueBox: {
    width: 56,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueBoxEditing: {
    borderColor: colors.tomato,
    borderWidth: 1.5,
  },
  valueText: {
    fontSize: 18,
    fontFamily: 'Komputa-Bold',
    color: colors.foreground,
  },
  valueInput: {
    fontSize: 18,
    fontFamily: 'Komputa-Bold',
    color: colors.foreground,
    textAlign: 'center',
    padding: 0,
    width: 44,
    height: 24,
  },
  unit: {
    fontSize: 15,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    width: 28,
  },
});
