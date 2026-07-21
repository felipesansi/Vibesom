import { useState, useMemo } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export function useBluetooth() {
  // Inicializa o gerenciador BLE de forma segura, com fallback para null caso não haja suporte nativo (ex: Expo Go)
  const bleManager = useMemo(() => {
    try {
      return new BleManager();
    } catch (e) {
      console.log("Bluetooth não suportado neste ambiente (provavelmente Expo Go ou Web).");
      return null;
    }
  }, []);
  
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  // Solicita permissões necessárias para o Bluetooth (especialmente no Android)
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return (
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // No iOS, as permissões são resolvidas pelo Info.plist (ou app.json)
  };

  const scanForPeripherals = async () => {
    if (!bleManager) {
      console.log("O gerenciador BLE não foi inicializado.");
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.log("Permissões de Bluetooth negadas");
      return;
    }

    setIsScanning(true);
    setAllDevices([]); // Limpa a lista antes de um novo scan

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Erro no scan:", error);
        setIsScanning(false);
        return;
      }
      
      // Se encontrou um dispositivo com nome
      if (device && device.name) {
        setAllDevices(prev => {
          // Evita duplicatas na lista checando pelo ID do dispositivo
          const isDuplicate = prev.find(d => d.id === device.id);
          if (!isDuplicate) {
            return [...prev, device];
          }
          return prev;
        });
      }
    });
  };

  const stopScanning = () => {
    if (!bleManager) return;
    bleManager.stopDeviceScan();
    setIsScanning(false);
  };

  const connectToDevice = async (device: Device) => {
    if (!bleManager) return;
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);
      await deviceConnection.discoverAllServicesAndCharacteristics();
      stopScanning();
      console.log('Conectado ao dispositivo:', deviceConnection.name || deviceConnection.id);
    } catch (e) {
      console.error('Erro ao conectar no dispositivo', e);
    }
  };

  const disconnectFromDevice = async () => {
    if (connectedDevice && bleManager) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
        console.log('Desconectado do dispositivo');
      } catch (e) {
        console.error('Erro ao desconectar', e);
      }
    }
  };

  const abrirConfiguracoesBluetooth = async () => {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS
        );
      } catch (e) {
        console.error("Erro ao abrir configs de bluetooth no Android", e);
      }
    } else {
      try {
        await Linking.openURL('App-Prefs:Bluetooth');
      } catch (e) {
        console.error("Erro ao abrir configs de bluetooth no iOS", e);
      }
    }
  };

  return {
    scanForPeripherals,
    stopScanning,
    connectToDevice,
    disconnectFromDevice,
    abrirConfiguracoesBluetooth,
    allDevices,
    connectedDevice,
    isScanning,
    bleManager
  };
}
