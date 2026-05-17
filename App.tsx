import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import {
  Timestamp,
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { db, auth } from "./firebase";

type Registro = {
  id: string;
  nome: string;
  calorias: number;
  data: string;
  hora: string;
};

const Tab = createBottomTabNavigator();

function dataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function horaAgora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function horaDoRegistro(hora?: string, createdAt?: Timestamp): string {
  if (hora) return hora;
  if (createdAt) {
    return createdAt.toDate().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "";
}

function formatarData(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CadastroScreen({ userId }: { userId: string }) {
  const [nome, setNome] = useState("");
  const [calorias, setCalorias] = useState("");
  const [data, setData] = useState(dataHoje());
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const kcal = Number(calorias);
    if (!nome.trim()) {
      Alert.alert("Preencha o nome");
      return;
    }
    if (!kcal || kcal <= 0) {
      Alert.alert("Calorias inválidas");
      return;
    }

    setSalvando(true);
    try {
      await addDoc(collection(db, "meals"), {
        userId,
        nome: nome.trim(),
        calorias: Math.round(kcal),
        data,
        hora: horaAgora(),
        createdAt: serverTimestamp(),
      });
      setNome("");
      setCalorias("");
      setData(dataHoje());
      Alert.alert("Salvo!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar no Firebase.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Cadastrar</Text>

        <Text style={styles.label}>Alimento / refeição</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Arroz com frango"
        />

        <Text style={styles.label}>Calorias (kcal)</Text>
        <TextInput
          style={styles.input}
          value={calorias}
          onChangeText={setCalorias}
          placeholder="Ex.: 450"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
        <TextInput style={styles.input} value={data} onChangeText={setData} />
        <Text style={styles.horaPreview}>
          Horário do cadastro: {horaAgora()}
        </Text>

        <Pressable style={styles.botao} onPress={salvar} disabled={salvando}>
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botaoTexto}>Adicionar</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoricoScreen({
  userId,
  navigation,
}: {
  userId: string;
  navigation: any;
}) {
  const [lista, setLista] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [diasExpandidos, setDiasExpandidos] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    const q = query(
      collection(db, "meals"),
      where("userId", "==", userId),
      orderBy("data", "desc"),
    );
    return onSnapshot(q, (snap) => {
      const itens: Registro[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          nome: String(d.nome ?? ""),
          calorias: Number(d.calorias ?? 0),
          data: String(d.data ?? ""),
          hora: horaDoRegistro(
            d.hora ? String(d.hora) : undefined,
            d.createdAt instanceof Timestamp ? d.createdAt : undefined,
          ),
        };
      });
      setLista(itens);
      setCarregando(false);

      setDiasExpandidos((prev) => {
        const novoEstado = { ...prev };
        itens.forEach((item) => {
          if (novoEstado[item.data] === undefined) {
            novoEstado[item.data] = true;
          }
        });
        return novoEstado;
      });
    });
  }, [userId]);

  function alternarDia(data: string) {
    setDiasExpandidos((prev) => ({
      ...prev,
      [data]: !prev[data],
    }));
  }

  function gerenciarRefeicao(item: Registro) {
    Alert.alert("O que deseja fazer?", `Refeição: ${item.nome}`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Editar",
        onPress: () =>
          Alert.alert(
            "Aviso",
            "Funcionalidade de edição em desenvolvimento pelo outro desenvolvedor.",
          ),
      },
      {
        text: "Apagar Refeição",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "meals", item.id));
          } catch (error) {
            Alert.alert("Erro", "Não foi possível apagar esta refeição.");
          }
        },
      },
    ]);
  }

  function deletarDiaInteiro(data: string, itensDoDia: Registro[]) {
    Alert.alert(
      "Apagar este dia?",
      `Isso excluirá todas as ${itensDoDia.length} refeições registradas em ${formatarData(data)}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, apagar dia",
          style: "destructive",
          onPress: async () => {
            try {
              const promises = itensDoDia.map((item) =>
                deleteDoc(doc(db, "meals", item.id)),
              );
              await Promise.all(promises);
            } catch (error) {
              Alert.alert("Erro", "Não foi possível apagar os dados do dia.");
            }
          },
        },
      ],
    );
  }

  async function deletarTodoOHistorico() {
    Alert.alert(
      "Atenção!",
      "Tem certeza que deseja apagar TODO o seu histórico? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, apagar tudo",
          style: "destructive",
          onPress: async () => {
            try {
              const q = query(
                collection(db, "meals"),
                where("userId", "==", userId),
              );
              const querySnapshot = await getDocs(q);
              const promises = querySnapshot.docs.map((documento) =>
                deleteDoc(doc(db, "meals", documento.id)),
              );
              await Promise.all(promises);
              Alert.alert("Sucesso", "Todo o seu histórico foi apagado.");
            } catch (error) {
              Alert.alert("Erro", "Não foi possível apagar os dados.");
            }
          },
        },
      ],
    );
  }

  const porData: Record<string, Registro[]> = {};
  for (const item of lista) {
    if (!porData[item.data]) porData[item.data] = [];
    porData[item.data].push(item);
  }
  const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a));

  if (carregando) {
    return (
      <View style={[styles.tela, styles.centro]}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
        <View style={styles.cabecalhoHistorico}>
          <Text style={styles.tituloSemMargem}>Histórico</Text>
          {lista.length > 0 && (
            <Pressable
              onLongPress={deletarTodoOHistorico}
              delayLongPress={800}
              style={({ pressed }) => [
                styles.botaoLixeira,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="trash-outline" size={24} color="#dc2626" />
            </Pressable>
          )}
        </View>

        {datas.length === 0 ? (
          <View style={styles.centroVazio}>
            <Text style={styles.vazio}>Nenhum registro ainda.</Text>
            <Pressable
              style={[styles.botao, { marginTop: 20, width: "100%" }]}
              onPress={() => navigation.navigate("Cadastro")}
            >
              <Text style={styles.botaoTexto}>Crie um agora!</Text>
            </Pressable>
          </View>
        ) : (
          datas.map((data) => {
            const itens = porData[data];
            const total = itens.reduce((s, i) => s + i.calorias, 0);
            const estaAberto = diasExpandidos[data] ?? true;

            return (
              <View key={data} style={styles.bloco}>
                <Pressable
                  onPress={() => alternarDia(data)}
                  onLongPress={() => deletarDiaInteiro(data, itens)}
                  delayLongPress={800}
                  style={styles.cabecalhoDiaBotao}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dataTitulo}>{formatarData(data)}</Text>
                    <Text style={styles.totalDia}>Total: {total} kcal</Text>
                  </View>
                  <Ionicons
                    name={estaAberto ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </Pressable>

                {estaAberto && (
                  <View style={styles.listaRefeicoes}>
                    {itens.map((item) => (
                      <Pressable
                        key={item.id}
                        onLongPress={() => gerenciarRefeicao(item)}
                        delayLongPress={800}
                        style={({ pressed }) => [
                          styles.linha,
                          {
                            backgroundColor: pressed
                              ? "#f9fafb"
                              : "transparent",
                          },
                        ]}
                      >
                        <View style={styles.linhaInfo}>
                          <Text style={styles.nome}>{item.nome}</Text>
                          {item.hora ? (
                            <Text style={styles.hora}>{item.hora}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.kcal}>{item.calorias} kcal</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [autenticando, setAutenticando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setAutenticando(false);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setUserId(cred.user.uid);
        } catch (error) {
          Alert.alert(
            "Erro de Autenticação",
            "Não foi possível iniciar uma sessão anônima.",
          );
        } finally {
          setAutenticando(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  if (autenticando) {
    return (
      <View style={[styles.tela, styles.centro]}>
        <ActivityIndicator size="large" color="#166534" />
        <Text style={{ marginTop: 12, color: "#666" }}>
          Iniciando sessão segura...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#166534",
          tabBarInactiveTintColor: "#888",
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;

            if (route.name === "Cadastro") {
              iconName = focused ? "restaurant" : "restaurant-outline";
            } else if (route.name === "Histórico") {
              iconName = focused ? "calendar" : "calendar-outline";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Cadastro">
          {() => <CadastroScreen userId={userId!} />}
        </Tab.Screen>
        <Tab.Screen name="Histórico">
          {({ navigation }) => (
            <HistoricoScreen userId={userId!} navigation={navigation} />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f5" },
  tela: { flex: 1, backgroundColor: "#f5f5f5" },
  conteudo: { padding: 16, paddingBottom: 32 },
  centro: { justifyContent: "center", alignItems: "center" },
  titulo: { fontSize: 22, fontWeight: "700", marginBottom: 16, color: "#111" },
  centroVazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#333" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  botao: {
    backgroundColor: "#166534",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  botaoTexto: { color: "#fff", fontSize: 16, fontWeight: "600" },
  horaPreview: { fontSize: 13, color: "#666", marginTop: -8, marginBottom: 14 },
  vazio: { color: "#666", fontSize: 15 },
  bloco: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dataTitulo: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  totalDia: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "600",
    marginBottom: 8,
  },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  linhaInfo: { flex: 1, marginRight: 8 },
  nome: { fontSize: 15, color: "#333" },
  hora: { fontSize: 12, color: "#888", marginTop: 2 },
  kcal: { fontSize: 15, fontWeight: "600", color: "#111" },
  cabecalhoHistorico: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tituloSemMargem: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  botaoLixeira: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  cabecalhoDiaBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  listaRefeicoes: {
    marginTop: 4,
  },
});
