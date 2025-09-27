import MapScreen from '@/components/map/map-screen';           // componente do mapa
import ButtonAddPlusRN from '@/components/plus-button/button-add-plus'; // botão flutuante (+)
import AddPropertiesModal from '@/components/properties/add-pluscode'; // modal para criar PlusCode
import ViewPropertiesModal from '@/components/properties/view-properties'; // modal para listar propriedades
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/auth/AuthContext'; // contexto do usuário logado

// formata CPF no padrão 000.000.000-00
function formatarCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]/g, ""); 
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

async function send_pdf(pluscode_info){
  /*
  Função para enviar pdf ao email do usuário

  pluscode_info -> Objeto contendo as informações necessárias
  para envio do pdf
  */
  try{
    const body = {
      surname: pluscode_info.result.surname,
      owner_email: pluscode_info.result.owner_email,
      pluscode_cod: pluscode_info.result.pluscode_cod,
      cod_imovel: pluscode_info.cod_imovel,
      cordinates: pluscode_info.result.cordinates,
      validation_date: pluscode_info.result.validation_date
    }

    console.log(body)
    const response = await fetch('/area_imovel/properties/pluscode/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

  }catch(error){
    console.log(`Erro ao enviar pdf para o email do usuário: ${error}`)
  }
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
  const [surnameModal, setSurnameModal] = useState(false)  // controla exibição do modal de apelido
  const [surname, setSurname] = useState('')  // variável para o apelido

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
                    // Se não houver imóvel selecionado, não faz nada
                    if (!plusCodeProperty?.properties?.cod_imovel) return;

                    /*
                      Guarda as coordenadas clicadas no mapa dentro do state
                      do imóvel selecionado. Essas coordenadas serão usadas
                      depois para criar o PlusCode.
                    */
                    setPlusCodeProperty((prev) => ({
                      ...prev,
                      cordinates: { latitude, longitude },
                    }));

                    /*
                      Abre o modal para o usuário informar um apelido
                      (ex: "Casa da Praia", "Sítio"). 
                      A criação do PlusCode só acontece depois que o usuário
                      confirmar no modal.
                    */
                    setSurnameModal(true);

                  } catch (e: any) {
                    Alert.alert('Erro', e?.message || 'Não foi possível preparar o Plus Code');
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
                /*
                Botão de confirmação do modal.
                Ao ser pressionado:
                  - Usa o apelido digitado e as coordenadas salvas no onMapPick
                  - Faz a requisição para gerar o PlusCode no backend
                  - Envia o PDF por e-mail
                  - Fecha o modal
                */
                className="bg-green-500 py-3 px-6 rounded-lg"
                onPress={async () => {
                  try {
                    if (!plusCodeProperty?.properties?.cod_imovel) return;
                    const cod = plusCodeProperty.properties.cod_imovel;

                    const body = {
                      surname: surname,
                      cod_imovel: cod,
                      owner_email: user.email,
                      pluscode_cod: "", // sempre enviar, mesmo vazio
                      cordinates: plusCodeProperty?.cordinates || {}, // coordenadas salvas no onMapPick
                    };

                    const resp = await fetch(`/area_imovel/properties/${cod}/pluscode`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                      body: JSON.stringify(body),
                    });

                    if (resp.ok) {
                      const responseData = await resp.json();
                      console.log(responseData);
                      await send_pdf(responseData);
                      setSurname("")

                      Alert.alert(
                        'Sucesso',
                        'Plus Code criado! Um certificado foi enviado ao seu e-mail.'
                      );
                    } else {
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
                  } catch (e: any) {
                    Alert.alert('Erro', e?.message || 'Não foi possível criar o Plus Code');
                  } finally {
                    setPickMode(false);
                    setPlusCodeProperty(null);
                    setSurnameModal(false); // fecha modal só no fim
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


        
  );
}


