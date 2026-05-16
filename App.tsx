import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import {
  Timestamp,
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function horaAgora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function horaDoRegistro(hora?: string, createdAt?: Timestamp): string {
  if (hora) return hora;
  if (createdAt) {
    return createdAt.toDate().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return '';
}

function formatarData(data: string) {
  const [a, m, d] = data.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function CadastroScreen() {
  const [nome, setNome] = useState('');
  const [calorias, setCalorias] = useState('');
  const [data, setData] = useState(dataHoje());
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const kcal = Number(calorias);
    if (!nome.trim()) {
      Alert.alert('Preencha o nome');
      return;
    }
    if (!kcal || kcal <= 0) {
      Alert.alert('Calorias inválidas');
      return;
    }

    setSalvando(true);
    try {
      await addDoc(collection(db, 'meals'), {
        nome: nome.trim(),
        calorias: Math.round(kcal),
        data,
        hora: horaAgora(),
        createdAt: serverTimestamp(),
      });
      setNome('');
      setCalorias('');
      setData(dataHoje());
      Alert.alert('Salvo!');
    } catch {
      Alert.alert('Erro', 'Confira o Firebase e o Firestore.');
    } finally {
      setSalvando(false);
    }
  }

  return (
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
      <Text style={styles.horaPreview}>Horário do cadastro: {horaAgora()}</Text>

      <Pressable style={styles.botao} onPress={salvar} disabled={salvando}>
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoTexto}>Adicionar</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function HistoricoScreen() {
  const [lista, setLista] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'meals'), orderBy('data', 'desc'));
    return onSnapshot(q, (snap) => {
      const itens: Registro[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          nome: String(d.nome ?? ''),
          calorias: Number(d.calorias ?? 0),
          data: String(d.data ?? ''),
          hora: horaDoRegistro(
            d.hora ? String(d.hora) : undefined,
            d.createdAt instanceof Timestamp ? d.createdAt : undefined,
          ),
        };
      });
      setLista(itens);
      setCarregando(false);
    });
  }, []);

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
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Histórico</Text>

      {datas.length === 0 ? (
        <Text style={styles.vazio}>Nenhum registro ainda.</Text>
      ) : (
        datas.map((data) => {
          const itens = porData[data];
          const total = itens.reduce((s, i) => s + i.calorias, 0);
          return (
            <View key={data} style={styles.bloco}>
              <Text style={styles.dataTitulo}>{formatarData(data)}</Text>
              <Text style={styles.totalDia}>Total: {total} kcal</Text>
              {itens.map((item) => (
                <View key={item.id} style={styles.linha}>
                  <View style={styles.linhaInfo}>
                    <Text style={styles.nome}>{item.nome}</Text>
                    {item.hora ? (
                      <Text style={styles.hora}>{item.hora}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.kcal}>{item.calorias} kcal</Text>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#166534',
          tabBarInactiveTintColor: '#888',
        }}
      >
        <Tab.Screen name="Cadastro" component={CadastroScreen} />
        <Tab.Screen name="Histórico" component={HistoricoScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#f5f5f5' },
  conteudo: { padding: 16, paddingBottom: 32 },
  centro: { justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#111' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  botao: {
    backgroundColor: '#166534',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  horaPreview: { fontSize: 13, color: '#666', marginTop: -8, marginBottom: 14 },
  vazio: { color: '#666', fontSize: 15 },
  bloco: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dataTitulo: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 4 },
  totalDia: { fontSize: 14, color: '#166534', fontWeight: '600', marginBottom: 8 },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  linhaInfo: { flex: 1, marginRight: 8 },
  nome: { fontSize: 15, color: '#333' },
  hora: { fontSize: 12, color: '#888', marginTop: 2 },
  kcal: { fontSize: 15, fontWeight: '600', color: '#111' },
});
