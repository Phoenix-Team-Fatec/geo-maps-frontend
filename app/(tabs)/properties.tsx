import MapScreen from '@/components/map/map-screen';           // componente do mapa
import ButtonAddPlusRN from '@/components/plus-button/button-add-plus'; // botão flutuante (+)
import AddPropertiesModal from '@/components/properties/add-pluscode'; // modal para criar PlusCode
import ViewPropertiesModal from '@/components/properties/view-properties'; // modal para listar propriedades
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext'; // contexto do usuário logado

// formata CPF no padrão 000.000.000-00
function formatarCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]/g, ""); 
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function PropertiesScreen() {
  // estados de controle
  const [plusCodeProperty, setPlusCodeProperty] = useState<any | null>(null); // imóvel alvo do PlusCode
  const [pickMode, setPickMode] = useState(false);                            // ativa/desativa modo "clicar no mapa"
  const { user } = useAuth();                                                 // usuário logado
  const [, setUserCpf] = useState<string | null>(null);
  const mapRef = useRef<any>(null);                                           // ref. para manipular o mapa
  const [showAdd, setShowAdd] = useState(false);                              // mostra modal AddProperties
  const [showList, setShowList] = useState(false);                            // mostra modal ViewProperties
  const [properties, setProperties] = useState<any[]>([]);                    // lista de propriedades do usuário
  const [pendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [, setAllowClipboardPrompt] = useState(false);
  const [showButton, setShowButton] = useState(false);                        // controla exibição do botão flutuante

  // centraliza mapa nas coordenadas recebidas
  const handleCenter = (coords: { latitude: number; longitude: number }) => {
    if (mapRef.current && mapRef.current.centerOn) {
      mapRef.current.centerOn(coords);
    }
    setShowList(false);
  };

  // busca propriedades do backend por CPF
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

  // ao carregar propriedades, centraliza no primeiro imóvel
  useEffect(() => {
    if (properties.length > 0 && mapRef.current && mapRef.current.centerOn) {
      const [lng, lat] = properties[0].geometry.coordinates[0][0]; 
      mapRef.current.centerOn({ latitude: lat, longitude: lng });
    }
  }, [properties]);

  // carrega propriedades do usuário logado
  useEffect(() => {
    if (user?.cpf) {
      const formatted = formatarCPF(user.cpf);
      setUserCpf(formatted);
      fetchProperties(formatted);
    }
  }, [user]);

  // exibe botão flutuante após 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 5000);
    return () => clearTimeout(timer);
  },[]);

  return (
    <View className="flex-1 bg-[#1a1a2e] p-4">
      <StatusBar style="light" />

      {/* título da tela */}
      <Text className="text-white text-xl font-semibold mt-8 mb-">
        Propriedades
      </Text>

      {/* mapa principal */}
      <View className="flex-1">
        <View className="flex-1 w-full rounded-xl overflow-hidden">
          <MapScreen
            ref={mapRef}
            markers={properties}          // marca propriedades no mapa
            selectedPoint={pendingCoords} // ponto selecionado
            userProperties={properties}   // lista de propriedades
            pickMode={pickMode}           // ativa modo de seleção
            // callback ao clicar no mapa
            onMapPick={async ({ latitude, longitude }) => {
              try {
                if (!plusCodeProperty?.properties?.cod_imovel) return;
                const cod = plusCodeProperty.properties.cod_imovel;

                // monta body do POST
                const body = {
                  cod_imovel: cod,
                  owner_name: (user?.nome && user?.sobrenome) 
                    ? `${user.nome} ${user.sobrenome}`.trim() 
                    : (user?.nome || user?.email || 'Usuário'),
                  pluscode_cod: "", // sempre enviar, mesmo vazio
                  cordinates: { longitude, latitude },
                };


                // envia POST ao backend
                const resp = await fetch(`/area_imovel/properties/${cod}/pluscode`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                  body: JSON.stringify(body),
                });

                if (!resp.ok) {
                  let msg = `Falha ao criar Plus Code (${resp.status})`;
                  try {
                    const err = await resp.json();
                    if (err?.detail) {
                      msg = Array.isArray(err.detail)
                        ? err.detail.map((d: any) => d?.msg || JSON.stringify(d)).join('\n')
                        : (err.detail?.msg || JSON.stringify(err.detail));
                    }
                  } catch {
                    try { msg = await resp.text(); } catch {}
                  }
                  throw new Error(msg);
                }

                Alert.alert('Sucesso', 'Plus Code criado a partir do ponto selecionado!');
              } catch (e: any) {
                Alert.alert('Erro', e?.message || 'Não foi possível criar o Plus Code');
              } finally {
                setPickMode(false);
                setPlusCodeProperty(null);
              }
            }}
          />
        </View>
      </View>

      {/* botão flutuante (aparece após 5s) */}
      {showButton && (
        <ButtonAddPlusRN
          onAdd={() => {
            setAllowClipboardPrompt(true);
            setShowAdd(true); // abre modal AddPropertiesModal
          }}
          onList={() => setShowList(true)} // abre modal ViewPropertiesModal
        />
      )}

      {/* modal para criar PlusCode */}
      <AddPropertiesModal
        visible={showAdd}
        onClose={() => {
          setShowAdd(false);
          setAllowClipboardPrompt(false);
        }}
        codImovel={plusCodeProperty?.properties?.cod_imovel} // passa imóvel alvo
        onCreated={(saved) => {
          setShowAdd(false);
          setPlusCodeProperty(null);
        }}
        onSelectOnMap={() => setPickMode(true)} // ativa seleção no mapa
        onCenterProperty={() => {}}             // (ainda vazio)
      />

      {/* modal de listagem das propriedades */}
      <ViewPropertiesModal
        visible={showList}
        onClose={() => setShowList(false)}
        properties={properties}
        onCenter={handleCenter} // centraliza no imóvel
        onGeneratePlusCode={(property) => {
          setPlusCodeProperty(property); // guarda o imóvel escolhido
          setShowList(false);
          setShowAdd(true);              // abre modal AddPropertiesModal
        }}
      />
    </View>
  );
}
