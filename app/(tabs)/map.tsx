import { useAuth } from '@/auth/AuthContext';
import RouteProtection from '@/components/auth/RouteProtection';
import MapScreen from '@/components/map/map-screen';
import ButtonAddPlusRN from '@/components/plus-button/button-add-plus';
import AddPropertiesModal from '@/components/properties/add-pluscode';
import UpdatePlusCodeModal from '@/components/properties/update-pluscode';
import ViewPropertiesModal from '@/components/properties/view-properties';
import { subscribe } from '@/src/services/propertiesStore';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Format CPF to 000.000.000-00 pattern
function formatarCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]/g, "");
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Send Plus Code certificate PDF via email
async function send_pdf(pluscode_info) {
  try {
    const body = {
      surname: pluscode_info.result?.surname,
      owner_email: pluscode_info.result?.owner_email,
      pluscode_cod: pluscode_info.result?.pluscode_cod,
      cod_imovel: pluscode_info.result?.cod_imovel || pluscode_info.cod_imovel,
      cordinates: pluscode_info.result?.cordinates,
      validation_date: pluscode_info.result?.validation_date,
      updates_logs: pluscode_info.result?.updates_logs || []
    };

    const response = await fetch('/area_imovel/properties/pluscode/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const msg = await response.text();
      throw new Error(`Falha ao enviar PDF: ${msg}`);
    }
  } catch (error) {
    console.log(`Erro ao enviar pdf para o email do usuário: ${error}`);
  }
}

export default function MapTab() {
  // Store markers for route/condition system
  const [markers, setMarkers] = useState<any[]>([]);

  // Auth state
  const { user } = useAuth();

  // Property management state
  const [plusCodeProperty, setPlusCodeProperty] = useState<any | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [, setUserCpf] = useState<string | null>(null);

  // Modal visibility state
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [surnameModal, setSurnameModal] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Plus Code operation state
  const [surname, setSurname] = useState('');
  const [updateCoords, setUpdateCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setAllowClipboardPrompt] = useState(false);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasRoute, setHasRoute] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Map reference
  const mapRef = useRef<any>(null);

  // Subscribe to properties store for markers
  useEffect(() => {
    const unsub = subscribe((items) => setMarkers(items));
    return unsub;
  }, []);

  // Fetch user properties by CPF
  const fetchProperties = async (cpf: string) => {
    try {
      const response = await fetch(`/area_imovel/properties/${cpf}`, { method: "GET" });
      if (response.ok) {
        const response_json = await response.json();
        setProperties(response_json);
        console.log("Propriedades carregadas:", response_json);
      }
    } catch (error) {
      console.log(`Erro ao carregar propriedades: ${error}`);
    }
  };

  // Center map on first property when loaded
  useEffect(() => {
    if (properties.length > 0 && mapRef.current && mapRef.current.centerOn) {
      const [lng, lat] = properties[0].geometry.coordinates[0][0];
      mapRef.current.centerOn({ latitude: lat, longitude: lng });
    }
  }, [properties]);

  // Load properties for logged-in user
  useEffect(() => {
    if (user?.cpf) {
      const formatted = formatarCPF(user.cpf);
      setUserCpf(formatted);
      fetchProperties(formatted);
    }
  }, [user]);

  // Show Plus Code button after 5 seconds (only for logged-in users)
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => setShowButton(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Center map on specific coordinates
  const handleCenter = (coords: { latitude: number; longitude: number }) => {
    if (mapRef.current && mapRef.current.centerOn) {
      mapRef.current.centerOn(coords);
    }
    setShowList(false);
  };

  return (
    <RouteProtection allowGuest={true}>
      <View className="flex-1 bg-[#1a1a2e]">
        <StatusBar style="light" />

        {/* Main map */}
        <View className="flex-1">
          <View className="flex-1 w-full rounded-xl overflow-hidden">
            <MapScreen
              ref={mapRef}
              markers={[...markers, ...properties]}
              userProperties={properties}
              pickMode={pickMode}
              onNavigationStateChange={(navigating, route) => {
                setIsNavigating(navigating);
                setHasRoute(route);
              }}
              onSearchStateChange={(searching) => {
                setIsSearching(searching);
              }}
              onMapPick={async ({ latitude, longitude }) => {
                try {
                  const item = plusCodeProperty;
                  if (!item?.properties?.cod_imovel) return;
                  const hasPlus = Boolean(item?.pluscode?.pluscode_cod);

                  if (hasPlus) {
                    // UPDATE flow: capture coords and reopen update modal
                    setPickMode(false);
                    setUpdateCoords({ lat: latitude, lng: longitude });
                    setShowUpdate(true);
                  } else {
                    // CREATE flow: capture coords and show surname modal
                    setPlusCodeProperty(prev => ({
                      ...prev,
                      cordinates: { latitude, longitude },
                    }));
                    setSurnameModal(true);
                  }
                } catch (e: any) {
                  Alert.alert('Erro', e?.message || 'Falha na operação.');
                }
              }}
            />
          </View>
        </View>

        {/* Floating Plus Code button (only for logged-in users, hidden during navigation/routing/searching) */}
        {user && showButton && !isNavigating && !hasRoute && !isSearching && (
          <ButtonAddPlusRN
            onAdd={() => {
              setAllowClipboardPrompt(true);
              setShowAdd(true);
            }}
            onList={() => setShowList(true)}
          />
        )}

        {/* Add Plus Code Modal */}
        <AddPropertiesModal
          visible={showAdd}
          onClose={() => setShowAdd(false)}
          codImovel={plusCodeProperty?.properties?.cod_imovel}
          onCreated={() => {
            setShowAdd(false);
            setPlusCodeProperty(null);
          }}
          onSelectOnMap={() => setPickMode(true)}
        />

        {/* Update Plus Code Modal */}
        <UpdatePlusCodeModal
          visible={showUpdate}
          onClose={() => {
            setShowUpdate(false);
            setUpdateCoords(null);
          }}
          codImovel={plusCodeProperty?.properties?.cod_imovel}
          currentSurname={plusCodeProperty?.pluscode?.surname ?? ''}
          prefillCoords={updateCoords}
          onUpdated={() => {
            setShowUpdate(false);
            setPlusCodeProperty(null);
            setUpdateCoords(null);
          }}
          onSelectOnMap={() => setPickMode(true)}
        />

        {/* View Properties Modal */}
        <ViewPropertiesModal
          visible={showList}
          onClose={() => setShowList(false)}
          properties={properties}
          onCenter={handleCenter}
          onGeneratePlusCode={(property) => {
            const hasPlus = Boolean(property?.pluscode?.pluscode_cod);
            setPlusCodeProperty(property);
            setShowList(false);
            if (hasPlus) setShowUpdate(true);
            else setShowAdd(true);
          }}
        />

        {/* Surname Input Modal */}
        <Modal
          visible={surnameModal}
          animationType="slide"
          transparent
          onRequestClose={() => setSurnameModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center p-5">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="justify-center"
            >
              <View className="bg-gray-800 rounded-xl p-5 items-center">
                <Text className="text-white text-lg font-bold mb-4">
                  Adicionar Apelido
                </Text>

                <TextInput
                  className="bg-gray-700 text-white p-3 rounded-lg text-base w-full mb-4"
                  value={surname}
                  onChangeText={setSurname}
                  placeholder="Ex: Casa da praia, Sítio..."
                  placeholderTextColor="#666"
                  maxLength={50}
                  autoFocus
                />

                <TouchableOpacity
                  className="bg-green-500 py-3 px-6 rounded-lg"
                  onPress={async () => {
                    try {
                      // Validate property and email
                      if (!plusCodeProperty?.properties?.cod_imovel) return;
                      if (!user?.email || !user.email.includes('@')) {
                        Alert.alert('Login necessário', 'Faça login com um e-mail válido para gerar o Plus Code.');
                        return;
                      }

                      const cod = plusCodeProperty.properties.cod_imovel;
                      const coords = plusCodeProperty?.cordinates;

                      // Validate coordinates
                      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
                        throw new Error('Coordenadas ausentes: toque no mapa para escolher a posição.');
                      }

                      // Build request body
                      const body = {
                        id: 'temp',
                        surname: surname && surname.trim() ? surname.trim() : user.email.split('@')[0],
                        owner_email: user.email,
                        pluscode_cod: 'PENDING',
                        cod_imovel: cod,
                        cordinates: {
                          longitude: coords.longitude,
                          latitude: coords.latitude,
                        },
                        validation_date: new Date().toISOString(),
                        updates_logs: [],
                      };

                      // Create Plus Code
                      const resp = await fetch(`/area_imovel/properties/${cod}/pluscode`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify(body),
                      });

                      if (!resp.ok) {
                        let msg = `Falha ao criar Plus Code (${resp.status})`;
                        try {
                          const ct = resp.headers.get('content-type') || '';
                          if (ct.includes('application/json')) {
                            const err = await resp.json();
                            msg = err?.detail
                              ? (Array.isArray(err.detail)
                                ? err.detail.map((d: any) => d?.msg || JSON.stringify(d)).join('\n')
                                : (err.detail?.msg || JSON.stringify(err.detail)))
                              : JSON.stringify(err);
                          } else {
                            msg = await resp.text();
                          }
                        } catch { }
                        throw new Error(msg);
                      }

                      const responseData = await resp.json();

                      // Send PDF certificate
                      await send_pdf(responseData);
                      setSurname('');
                      Alert.alert('Sucesso', 'Plus Code criado! Um certificado foi enviado ao seu e-mail.');

                      // Refresh properties
                      if (user?.cpf) {
                        fetchProperties(formatarCPF(user.cpf));
                      }
                    } catch (e: any) {
                      Alert.alert('Erro', e?.message || 'Não foi possível criar o Plus Code');
                    } finally {
                      setPickMode(false);
                      setPlusCodeProperty(null);
                      setSurnameModal(false);
                    }
                  }}
                >
                  <Text className="text-black font-semibold text-base">OK</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </RouteProtection>
  );
}