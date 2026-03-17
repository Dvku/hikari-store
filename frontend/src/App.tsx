import { useState, useEffect, useCallback } from "react";
import "./App.css";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Switch,
  FormControl,
  InputLabel,
  type SelectChangeEvent,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import DashboardIcon from "@mui/icons-material/Dashboard";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Legend,
  Cell,
  Pie,
} from "recharts";
import { CHILE_DATA } from "./data/chileData";

const DELIVERY_METHODS = [
  { value: "METRO", label: "Entrega en Metro" },
  { value: "SANTIAGO", label: "Despacho Santiago (Pyme/Blue Express)" },
  { value: "REGION", label: "Envío a Región (Blue Express)" },
];

const getDateRanges = () => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // 🚀 CAMBIO: En lugar de buscar el lunes, restamos 7 días exactos
  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 7);

  // Primero de este mes
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    today,
    week: last7Days.toISOString().split("T")[0], // Ahora son los últimos 7 días
    month: startOfMonth.toISOString().split("T")[0],
    yearStart: `${now.getFullYear()}-01-01`,
    yearEnd: `${now.getFullYear()}-12-31`,
  };
};

interface Product {
  id: string;
  name: string;
  price_cost: number;
  price_sale: number;
  stock: number;
  min_stock: number;
  image_url: string | null;
  is_pack: boolean; // Nuevo campo para identificar si es un pack
  is_active: boolean;
  pack_items?: {
    id: string;
    quantity: number;
    component: {
      name: string;
      stock: number;
      image_url: string | null;
    };
  }[];
}
interface OrderItem {
  product_id: string;
  quantity: number;
  price: number; // Precio de venta al momento de la compra (para mantener histórico)
  product?: Product; // Relación para mostrar el nombre del producto en la tabla de ventas
}

interface Order {
  id: string;
  customer_name: string;
  total_amount: number;
  social_handle: string;
  social_platform: string;
  region: string;
  commune: string;
  delivery_method: string;
  delivery_cost: number;
  status: string;
  items: OrderItem[];
  created_at: string;
}

interface DashboardData {
  kpis: {
    ingresosReales: number;
    varIngresos: number;
    varPedidos: number;
    gananciaReal: number;
    inversionStock: number;
    gananciaProyectada: number;
    ticketPromedio: number;
    pedidosTotales: number;
  };
  salesChart: { date: string; total: number }[];
  topProducts: { name: string; qty: number }[];
  platformChart: { name: string; value: number }[];
  deliveryChart: { name: string; value: number }[];
}

// 🎨 Nuevo Tema Claro y Limpio (Estilo SaaS / Dashboard)
const modernTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f4f7fe", // Un gris/celeste ultra-claro para el fondo
      paper: "#ffffff", // Tarjetas blancas limpias
    },
    primary: { main: "#4318FF" }, // Azul moderno para acciones
    secondary: { main: "#05CD99" }, // Verde menta vibrante
    text: {
      primary: "#2B3674", // Azul muy oscuro para los títulos
      secondary: "#A3AED0", // Gris azulado para textos menores
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const drawerWidth = 260; // El ancho exacto de nuestro nuevo menú lateral
const collapsedWidth = 75;
function App() {
  // --- 1️⃣ TODOS LOS ESTADOS (useState) ---
  // Van todos juntos al principio. Sin funciones entre medio.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem("token"),
  );
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeModule, setActiveModule] = useState<
    "dashboard" | "inventory" | "orders"
  >("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [isPack, setIsPack] = useState(false);
  const [packItems, setPackItems] = useState<
    { component_id: string; quantity: number }[]
  >([]);
  const [showForm, setShowForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [viewOrderDetails, setViewOrderDetails] = useState<Order | null>(null);
  const [viewPackDetails, setViewPackDetails] = useState<Product | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [open, setOpen] = useState(true); // Controla si el sidebar está expandido
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "success" });

  const [formData, setFormData] = useState({
    customer_name: "",
    social_handle: "",
    social_platform: "INSTAGRAM",
    region: "",
    commune: "",
    delivery_method: "METRO",
    delivery_cost: 0,
    items: [{ product_id: "", quantity: 1, price: 0 }],
  });

  // Filtrado de comunas: Esta variable se actualiza sola cada vez que cambia la región
  const comunasFiltradas =
    CHILE_DATA.find((r) => r.region === formData.region)?.comunas || [];

  // Handler de cambio de región: Maneja la lógica de limpiar la comuna previa
  const handleRegionChange = (e: SelectChangeEvent) => {
    const selectedRegion = e.target.value;

    setFormData({
      ...formData,
      region: selectedRegion,
      commune: "", // 💡 Esto evita que quede una comuna de la región anterior
    });
  };

  const [productFormData, setProductFormData] = useState({
    name: "",
    price_cost: "",
    price_sale: "",
    stock: "",
  });

  // --- 2️⃣ FUNCIONES MEMORIZADAS (useCallback) ---
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setProducts([]);
    setOrders([]);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchStats = useCallback(async (start: string, end: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/stats?start=${start}&end=${end}`,
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error cargando stats de Hikari Store:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const resProducts = await fetch("http://localhost:3000/products", {
        headers,
      });
      if (resProducts.ok) {
        setProducts(await resProducts.json());
      } else if (resProducts.status === 401) {
        handleLogout();
      }

      const resOrders = await fetch("http://localhost:3000/orders", {
        headers,
      });
      if (resOrders.ok) {
        setOrders(await resOrders.json());
      }
    } catch (error) {
      console.error("Error al traer los datos:", error);
    }
  }, [getAuthHeaders, handleLogout]);

  const [dateRange, setDateRange] = useState({
    start: getDateRanges().month, // Por defecto: Este mes
    end: getDateRanges().today,
  });

  useEffect(() => {
    // Creamos un envoltorio asíncrono explícito
    const initDashboard = async () => {
      if (isAuthenticated) {
        await fetchData(); // El 'await' le demuestra al linter que esto no es inmediato
        fetchStats(dateRange.start, dateRange.end);
      }
    };
    initDashboard();
  }, [isAuthenticated, fetchData, fetchStats, dateRange]);
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const addPackItem = () =>
    setPackItems([...packItems, { component_id: "", quantity: 1 }]);
  const removePackItem = (index: number) =>
    setPackItems(packItems.filter((_, i) => i !== index));

  const updatePackItem = (
    index: number,
    field: "component_id" | "quantity",
    value: string | number,
  ) => {
    const newItems = [...packItems];
    newItems[index] = { ...newItems[index], [field]: value } as {
      component_id: string;
      quantity: number;
    };
    setPackItems(newItems);
  };

  const addCartItem = () =>
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: "", quantity: 1, price: 0 }],
    });
  const removeCartItem = (index: number) =>
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });

  const updateCartItem = (
    index: number,
    field: "product_id" | "quantity",
    value: string | number,
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value } as {
      product_id: string;
      quantity: number;
      price: number;
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleOpenPackDetails = (product: Product) => {
    setViewPackDetails(product);
  };

  const handleClosePackDetails = () => {
    setViewPackDetails(null);
  };

  const handleOpenOrderDetails = (order: Order) => setViewOrderDetails(order);
  const handleCloseOrderDetails = () => setViewOrderDetails(null);

  // --- 🔑 LÓGICA DE INICIO DE SESIÓN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        setIsAuthenticated(true);
        setLoginData({ username: "", password: "" });
      } else {
        alert("⚠️ Acceso denegado. Credenciales incorrectas.");
      }
    } catch (error) {
      console.error("Error de red al intentar iniciar sesión", error);
      alert("Error de conexión con el servidor.");
    }
  };

  // Ahora fetchData es segura para incluirla en las dependencias del useEffect
  useEffect(() => {
    // Creamos un envoltorio asíncrono explícito
    const initDashboard = async () => {
      if (isAuthenticated) {
        await fetchData(); // El 'await' le demuestra al linter que esto no es inmediato
      }
    };

    initDashboard();
  }, [isAuthenticated, fetchData]);

  const ranges = getDateRanges();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Calculamos el Total (Subtotal productos + Envío)
    // Obtenemos los precios actuales de los productos seleccionados en el form
    const subtotal = formData.items.reduce((acc, item) => {
      // Si no hay precio (ej: producto no seleccionado), sumamos 0
      return acc + Number(item.price || 0) * item.quantity;
    }, 0);

    const totalFinal = subtotal + Number(formData.delivery_cost || 0);

    // 2. Preparamos el Payload final
    const payload = {
      ...formData,
      social_platform: formData.social_platform.toUpperCase(), // Aseguramos que la plataforma esté en mayúsculas
      total_amount: totalFinal,
      // Nos aseguramos de que los costos sean números reales
      delivery_cost: Number(formData.delivery_cost),
    };

    try {
      const response = await fetch("http://localhost:3000/orders", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // 🟢 NOTIFICACIÓN DE ÉXITO: Reemplaza al alert
        setSnackbar({
          open: true,
          message: "¡Venta registrada con éxito! 📦✨",
          severity: "success",
        });

        setShowForm(false);

        // Limpiar el formulario para la próxima venta, asegurando que no queden datos residuales
        setFormData({
          customer_name: "",
          social_handle: "",
          social_platform: "Instagram",
          region: "",
          commune: "",
          delivery_method: "METRO",
          delivery_cost: 0,
          items: [{ product_id: "", quantity: 1, price: 0 }],
        });
        fetchData();

        fetchStats(ranges.today, ranges.today);
        setDateRange({ start: ranges.today, end: ranges.today });
      } else {
        // NOTIFICACIÓN DE ERROR (Respuesta no OK del servidor)
        setSnackbar({
          open: true,
          message: "No se pudo registrar la venta. Revisa el stock disponible.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      // NOTIFICACIÓN DE ERROR (Fallo de red o servidor caído)
      setSnackbar({
        open: true,
        message: "Error de conexión con el servidor. Inténtalo más tarde.",
        severity: "error",
      });
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:3000/orders/${orderId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = new FormData();
    data.append("name", productFormData.name);
    data.append("price_cost", productFormData.price_cost.toString());
    data.append("price_sale", productFormData.price_sale.toString());

    // 🚀 CAMBIO CRÍTICO: Si es pack, enviamos "0" para activar el stock virtual en el server
    data.append("stock", isPack ? "0" : productFormData.stock.toString());

    data.append("is_pack", isPack.toString());

    if (isPack && packItems.length > 0) {
      // 🛡️ Enviamos la "receta" del pack como un texto JSON
      data.append("pack_items", JSON.stringify(packItems));
    }

    if (selectedFile) {
      data.append("image", selectedFile);
    }

    try {
      const response = await fetch("http://localhost:3000/products", {
        method: "POST",
        headers: {
          ...getAuthHeaders(), // Sin Content-Type para que FormData funcione
        },
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
        return;
      }

      alert(isPack ? "¡Pack de 1D creado!" : "¡Producto creado!");

      // ✨ LIMPIEZA TOTAL: Para que el siguiente producto no herede datos viejos
      setSelectedFile(null);
      setIsPack(false);
      setPackItems([]);
      setProductFormData({
        name: "",
        price_cost: "",
        price_sale: "",
        stock: "",
      });

      fetchData(); // Recarga la tabla con los nuevos valores calculados
      setShowProductForm(false);
    } catch (error) {
      console.error("Error de red:", error);
    }
  };

  // LÓGICA PARA ELIMINAR PRODUCTO
  const handleDeleteProduct = async (id: string) => {
    // 1. Pedimos confirmación para evitar accidentes catastróficos
    const confirmDelete = window.confirm(
      "⚠️ ¿Estás seguro de que deseas eliminar este set? Esta acción no se puede deshacer.",
    );

    if (!confirmDelete) return; // Si el usuario cancela, detenemos la función aquí

    try {
      // 2. Enviamos la orden de destrucción con nuestro Pase VIP
      const response = await fetch(`http://localhost:3000/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        fetchData(); // 3. Recargamos la tabla para que el producto desaparezca visualmente
        alert("🗑️ Producto eliminado del inventario.");
      } else {
        alert("❌ Hubo un problema al intentar eliminar el producto.");
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  // Función para desactivar o activar un producto sin eliminarlo (Soft Delete)
  const handleToggleActive = async (id: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/products/${id}/toggle`,
        {
          method: "PATCH", // Asegúrate de tener este endpoint en tu ProductsController
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  // ✏️ LÓGICA PARA PREPARAR LA EDICIÓN
  const handleEditClick = (product: Product) => {
    setProductFormData({
      name: product.name,
      price_cost: product.price_cost.toString(),
      price_sale: product.price_sale.toString(),
      stock: product.stock.toString(),
    });
    setEditingProductId(product.id); // Le decimos a React: "Estamos en modo edición"
    setShowProductForm(true);
    setShowForm(false);
  };

  const toggleSaleForm = () => {
    setShowForm(!showForm);
    setShowProductForm(false);
  };
  const toggleProductForm = () => {
    setShowProductForm(!showProductForm);
    setShowForm(false);
    if (showProductForm) {
      setProductFormData({
        name: "",
        price_cost: "",
        price_sale: "",
        stock: "",
      });
      setEditingProductId(null); // Salimos del modo edición si estamos cancelando el formulario
    }
  };

  // --- 🚧 RENDERIZADO CONDICIONAL: LA BARRERA ---
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={modernTheme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default", // Ese gris/celeste ultra-claro
            p: 2,
          }}
        >
          <Container maxWidth="xs">
            {/* Tarjeta de Login limpia, sin sombras pesadas y con bordes redondeados */}
            <Card
              elevation={0}
              sx={{
                p: 4,
                borderRadius: "24px",
                border: "1px solid #E2E8F0",
                textAlign: "center",
              }}
            >
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "900", color: "#111C44", letterSpacing: 1 }}
                >
                  HIKARI <span style={{ color: "#05CD99" }}>STORE</span>
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#A3AED0", mt: 1, fontWeight: "500" }}
                >
                  Ingresa tus credenciales para continuar
                </Typography>
              </Box>

              <form onSubmit={handleLogin}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <TextField
                    label="Usuario"
                    variant="outlined"
                    fullWidth
                    required
                    value={loginData.username}
                    onChange={(e) =>
                      setLoginData({ ...loginData, username: e.target.value })
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }} // Cajas de texto redondeadas
                  />
                  <TextField
                    label="Contraseña"
                    type="password"
                    variant="outlined"
                    fullWidth
                    required
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{
                      mt: 2,
                      py: 1.5,
                      borderRadius: "12px",
                      fontWeight: "bold",
                      fontSize: "1rem",
                      backgroundColor: "#4318FF",
                      "&:hover": { backgroundColor: "#3311DB" },
                      textTransform: "none",
                    }}
                  >
                    Iniciar Sesión
                  </Button>
                </Box>
              </form>
            </Card>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  // --- EL DASHBOARD ---
  return (
    <ThemeProvider theme={modernTheme}>
      <CssBaseline />

      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* 🧭 COLUMNA IZQUIERDA: MENÚ LATERAL OSCURO (SIDEBAR) */}
        <Drawer
          variant="permanent"
          sx={{
            width: open ? drawerWidth : collapsedWidth,
            flexShrink: 0,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            transition: "width 0.3s ease",
            "& .MuiDrawer-paper": {
              width: open ? drawerWidth : collapsedWidth,
              transition: "width 0.3s ease",
              overflowX: "hidden",
              backgroundColor: "#111C44",
              color: "#ffffff",
              borderRight: "none",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          {/* CABECERA: Logo + Botón Toggle */}
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "space-between" : "center",
              px: open ? 3 : 0,
              mt: 2,
              mb: 1,
            }}
          >
            {open && (
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "900",
                  letterSpacing: 1,
                  whiteSpace: "nowrap",
                }}
              >
                HIKARI <span style={{ color: "#05CD99" }}>STORE</span>
              </Typography>
            )}
            <Button
              onClick={() => setOpen(!open)}
              sx={{
                minWidth: 0,
                color: "#A3AED0",
                "&:hover": { color: "#ffffff" },
              }}
            >
              {open ? "◀" : "▶"}
            </Button>
          </Toolbar>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />

          {/* LISTA DE NAVEGACIÓN */}
          <List sx={{ px: open ? 2 : 1 }}>
            {/* DASHBOARD */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => setActiveModule("dashboard")}
                sx={{
                  borderRadius: "12px",
                  justifyContent: open ? "initial" : "center",
                  backgroundColor:
                    activeModule === "dashboard"
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: activeModule === "dashboard" ? "#05CD99" : "#A3AED0",
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  <DashboardIcon />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary="Dashboard"
                    primaryTypographyProps={{
                      fontWeight: activeModule === "dashboard" ? "bold" : "500",
                      color:
                        activeModule === "dashboard" ? "#ffffff" : "#A3AED0",
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>

            {/* 📦 INVENTARIO */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => setActiveModule("inventory")}
                sx={{
                  borderRadius: "12px",
                  justifyContent: open ? "initial" : "center",
                  backgroundColor:
                    activeModule === "inventory"
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: activeModule === "inventory" ? "#05CD99" : "#A3AED0",
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  <InventoryIcon />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary="Inventario"
                    primaryTypographyProps={{
                      fontWeight: activeModule === "inventory" ? "bold" : "500",
                      color:
                        activeModule === "inventory" ? "#ffffff" : "#A3AED0",
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>

            {/* 🛒 PEDIDOS */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => setActiveModule("orders")}
                sx={{
                  borderRadius: "12px",
                  justifyContent: open ? "initial" : "center",
                  backgroundColor:
                    activeModule === "orders"
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: activeModule === "orders" ? "#05CD99" : "#A3AED0",
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  <AddShoppingCartIcon />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary="Todos los Pedidos"
                    primaryTypographyProps={{
                      fontWeight: activeModule === "orders" ? "bold" : "500",
                      color: activeModule === "orders" ? "#ffffff" : "#A3AED0",
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          </List>

          <Box sx={{ flexGrow: 1 }} />

          {/* 🚪 CERRAR SESIÓN */}
          <List sx={{ px: open ? 2 : 1, mb: 3 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  borderRadius: "12px",
                  justifyContent: open ? "initial" : "center",
                  px: 2.5,
                  "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "#ef4444",
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  <LogoutIcon />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary="Cerrar Sesión"
                    primaryTypographyProps={{
                      fontWeight: "bold",
                      color: "#ef4444",
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>

        {/* 📦 COLUMNA DERECHA: CONTENIDO PRINCIPAL */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 3, md: 5 },
            width: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
            minHeight: "100vh",
          }}
        >
          <Container maxWidth={false} disableGutters sx={{ width: "100%" }}>
            {/* Título del módulo activo */}
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", mb: 4, color: "text.primary" }}
            >
              {activeModule === "dashboard" && "Dashboard Financiero"}
              {activeModule === "inventory" && "Gestión de Inventario"}
              {activeModule === "orders" && "Historial de Pedidos"}
            </Typography>

            {/* Contenido del módulo activo */}
            {/* Contenido del módulo activo */}
            {activeModule === "dashboard" && (
              <DashboardView
                stats={stats}
                onRangeChange={(start, end) => setDateRange({ start, end })}
                currentRange={
                  dateRange.start === ranges.today &&
                  dateRange.end === ranges.today
                    ? "today"
                    : dateRange.start === ranges.week
                      ? "week"
                      : dateRange.start === ranges.month
                        ? "month"
                        : "custom"
                }
                dateRange={dateRange}
              />
            )}
            {activeModule === "inventory" && (
              <InventoryView
                // Aquí ocurre la magia del filtro
                products={products.filter((p) =>
                  p.name.toLowerCase().includes(searchTerm.toLowerCase()),
                )}
                searchTerm={searchTerm} // Pasamos el texto
                setSearchTerm={setSearchTerm} // Pasamos la función para cambiar el texto
                onEdit={handleEditClick}
                onDelete={handleDeleteProduct}
                onToggle={handleToggleActive}
                onOpenPack={handleOpenPackDetails}
                onAdd={toggleProductForm}
              />
            )}

            {activeModule === "orders" && (
              <OrdersView
                orders={orders}
                onStatusChange={handleStatusChange}
                onAdd={toggleSaleForm}
                onViewDetails={handleOpenOrderDetails}
              />
            )}

            {/* MODAL: FORMULARIO DE PRODUCTO */}
            <Dialog
              open={showProductForm}
              onClose={toggleProductForm}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
                {editingProductId
                  ? "Editar Producto o Pack"
                  : "Ingresar Nuevo Producto / Pack"}
              </DialogTitle>
              <form onSubmit={handleProductSubmit}>
                <DialogContent dividers>
                  <Grid container spacing={2}>
                    {/* Nombre del Set */}
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Nombre del Producto"
                        required
                        value={productFormData.name}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            name: e.target.value,
                          })
                        }
                      />
                    </Grid>

                    {/* Costo, Venta y Stock */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Costo ($)"
                        type="number"
                        required
                        value={productFormData.price_cost}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            price_cost: e.target.value,
                          })
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Precio Venta ($)"
                        type="number"
                        required
                        value={productFormData.price_sale}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            price_sale: e.target.value,
                          })
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Stock Inicial"
                        type="number"
                        // Si es un pack, el campo se bloquea y se pone en 0
                        disabled={isPack}
                        required={!isPack}
                        value={isPack ? 0 : productFormData.stock}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            stock: e.target.value,
                          })
                        }
                        helperText={
                          isPack ? "Calculado automáticamente por insumos" : ""
                        }
                      />
                    </Grid>

                    {/* FASE 4: INTERRUPTOR DE PACK */}
                    <Grid size={{ xs: 12 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1.5,
                          bgcolor: isPack
                            ? "rgba(67, 24, 255, 0.05)"
                            : "transparent",
                          borderRadius: "12px",
                          border: isPack
                            ? "1px solid #4318FF"
                            : "1px solid #E2E8F0",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: "500", color: "#2B3674" }}
                        >
                          ¿Este producto es un Pack (Combo)?
                        </Typography>
                        <Switch
                          checked={isPack}
                          onChange={(e) => setIsPack(e.target.checked)}
                        />
                      </Box>
                    </Grid>

                    {/* LISTA DINÁMICA DE INSUMOS (Solo se ve si isPack es true) */}
                    {isPack && (
                      <Grid size={{ xs: 12 }}>
                        <Box
                          sx={{
                            p: 2,
                            border: "1px dashed #A3AED0",
                            borderRadius: "16px",
                            bgcolor: "#F4F7FE",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ mb: 2, color: "#2B3674", fontWeight: "bold" }}
                          >
                            Componentes del Pack (Stickers, Cuadernos, etc.)
                          </Typography>

                          {packItems.map((item, index) => (
                            <Box
                              key={index}
                              sx={{
                                display: "flex",
                                gap: 1,
                                mb: 1.5,
                                alignItems: "center",
                              }}
                            >
                              <TextField
                                select
                                fullWidth
                                label="Seleccionar Insumo"
                                size="small"
                                value={item.component_id}
                                onChange={(e) =>
                                  updatePackItem(
                                    index,
                                    "component_id",
                                    e.target.value,
                                  )
                                }
                              >
                                {products.map((p) => (
                                  <MenuItem key={p.id} value={p.id}>
                                    {p.name} (Stock: {p.stock})
                                  </MenuItem>
                                ))}
                              </TextField>

                              <TextField
                                type="number"
                                label="Cant."
                                size="small"
                                sx={{ width: 90 }}
                                value={item.quantity}
                                onChange={(e) =>
                                  updatePackItem(
                                    index,
                                    "quantity",
                                    parseInt(e.target.value),
                                  )
                                }
                              />

                              <Button
                                variant="contained"
                                color="error"
                                sx={{ minWidth: "40px", borderRadius: "8px" }}
                                onClick={() => removePackItem(index)}
                              >
                                X
                              </Button>
                            </Box>
                          ))}

                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={addPackItem}
                            sx={{
                              mt: 1,
                              borderRadius: "10px",
                              textTransform: "none",
                              fontWeight: "bold",
                            }}
                          >
                            + Agregar Insumo al Pack
                          </Button>
                        </Box>
                      </Grid>
                    )}

                    {/* 📸 SECCIÓN DE IMAGEN */}
                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        sx={{
                          py: 2,
                          borderStyle: "dashed",
                          borderRadius: "12px",
                          color: selectedFile ? "success.main" : "primary.main",
                        }}
                      >
                        {selectedFile
                          ? `✅ ${selectedFile.name}`
                          : "Subir Foto del Producto"}
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files)
                              setSelectedFile(e.target.files[0]);
                          }}
                        />
                      </Button>
                    </Grid>
                  </Grid>
                </DialogContent>

                <DialogActions sx={{ p: 2, bgcolor: "#F4F7FE" }}>
                  <Button
                    onClick={toggleProductForm}
                    color="inherit"
                    sx={{ fontWeight: "bold" }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    sx={{ borderRadius: "12px", px: 4, fontWeight: "bold" }}
                  >
                    {editingProductId ? "Actualizar" : "Guardar Producto"}
                  </Button>
                </DialogActions>
              </form>
            </Dialog>

            {/* 🛒 MODAL: FORMULARIO DE VENTA (SOCIAL CRM + LOGÍSTICA) */}
            <Dialog
              open={showForm}
              onClose={toggleSaleForm}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle sx={{ fontWeight: "bold", color: "secondary.main" }}>
                Registrar Nueva Venta
              </DialogTitle>
              <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                  <Grid container spacing={2}>
                    {/* --- SECCIÓN CLIENTE --- */}
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Nombre Cliente"
                        required
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customer_name: e.target.value,
                          })
                        }
                      />
                    </Grid>

                    {/* --- SOCIAL CRM --- */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        select
                        label="Plataforma"
                        value={formData.social_platform}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            social_platform: e.target.value,
                          })
                        }
                      >
                        <MenuItem value="INSTAGRAM">Instagram</MenuItem>
                        <MenuItem value="TIKTOK">TikTok</MenuItem>
                        <MenuItem value="FACEBOOK">
                          Facebook / Marketplace
                        </MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="@Usuario"
                        required
                        value={formData.social_handle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            social_handle: e.target.value,
                          })
                        }
                      />
                    </Grid>

                    {/* --- LOGÍSTICA --- */}
                    <Grid container spacing={2}>
                      {/* 1. Selector de Método de Entrega */}
                      <Grid size={{ xs: 12, md: 8 }}>
                        <FormControl fullWidth required>
                          <InputLabel id="delivery-method-label">
                            Método de Entrega
                          </InputLabel>
                          <Select
                            labelId="delivery-method-label"
                            label="Método de Entrega"
                            value={formData.delivery_method}
                            onChange={(e) => {
                              const method = e.target.value;

                              // Lógica Inteligente:
                              // Si es METRO o SANTIAGO, fijamos la RM. Si no, dejamos vacío para que elija.
                              const autoRegion =
                                method === "METRO" || method === "SANTIAGO"
                                  ? "Metropolitana de Santiago"
                                  : "";

                              setFormData({
                                ...formData,
                                delivery_method: method,
                                region: autoRegion,
                                commune: "", // Reseteamos la comuna para forzar la nueva selección
                              });
                            }}
                          >
                            {DELIVERY_METHODS.map((m) => (
                              <MenuItem key={m.value} value={m.value}>
                                {m.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* 2. Costo de Envío */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          fullWidth
                          label="Costo Envío ($)"
                          type="number"
                          // 💡 Si el valor es 0, lo mostramos como string vacío para que no estorbe
                          value={
                            formData.delivery_cost === 0
                              ? ""
                              : formData.delivery_cost
                          }
                          helperText={
                            formData.delivery_method === "REGION"
                              ? "Suele ser 'Por Pagar'"
                              : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            // 🚀 Permitimos que el estado sea "" (vacío) mientras el usuario borra
                            setFormData({
                              ...formData,
                              delivery_cost: val === "" ? 0 : parseInt(val),
                            });
                          }}
                        />
                      </Grid>

                      {/* 3. Selector de Región (Solo si NO es Metro) */}
                      {formData.delivery_method !== "METRO" && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth required>
                            <InputLabel id="region-label">Región</InputLabel>
                            <Select
                              labelId="region-label"
                              label="Región"
                              value={formData.region}
                              onChange={handleRegionChange} // Usamos el handler que limpia la comuna
                            >
                              {CHILE_DATA.map((r) => (
                                <MenuItem key={r.region} value={r.region}>
                                  {r.region}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}

                      {/* 4. Selector de Comuna / Estación de Metro */}
                      <Grid
                        size={{
                          xs: 12,
                          md: formData.delivery_method === "METRO" ? 12 : 6,
                        }}
                      >
                        {formData.delivery_method === "METRO" ? (
                          // 🚇 Caso Metro: Texto libre para la estación
                          <TextField
                            fullWidth
                            required
                            label="Estación de Metro"
                            placeholder="Ej: Los Leones, L1"
                            value={formData.commune}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                commune: e.target.value,
                              })
                            }
                          />
                        ) : (
                          // 🏘️ Caso Envío: Selector dinámico filtrado
                          <FormControl
                            fullWidth
                            required
                            disabled={!formData.region}
                          >
                            <InputLabel id="commune-label">Comuna</InputLabel>
                            <Select
                              labelId="commune-label"
                              label="Comuna"
                              value={formData.commune}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  commune: e.target.value,
                                })
                              }
                            >
                              {comunasFiltradas.map((c) => (
                                <MenuItem key={c} value={c}>
                                  {c}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Grid>
                    </Grid>

                    {/* 🛒 --- SECCIÓN CARRITO DINÁMICO --- */}
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 2 }}>PRODUCTOS EN ESTA VENTA</Divider>
                      {formData.items.map((item, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            gap: 1,
                            mb: 2,
                            alignItems: "center",
                          }}
                        >
                          <TextField
                            select
                            fullWidth
                            label="Producto"
                            size="small"
                            value={item.product_id}
                            onChange={(e) =>
                              updateCartItem(
                                index,
                                "product_id",
                                e.target.value,
                              )
                            }
                          >
                            {/* Solo mostramos productos activos en la venta */}
                            {products
                              .filter((p) => p.is_active)
                              .map((p) => (
                                <MenuItem
                                  key={p.id}
                                  value={p.id}
                                  disabled={p.stock < 1}
                                >
                                  {p.name} (Stock: {p.stock} | $
                                  {p.price_sale.toLocaleString("es-CL")})
                                </MenuItem>
                              ))}
                          </TextField>

                          <TextField
                            type="number"
                            label="Cant."
                            size="small"
                            sx={{ width: 80 }}
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartItem(
                                index,
                                "quantity",
                                parseInt(e.target.value),
                              )
                            }
                          />

                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            sx={{ minWidth: "40px" }}
                            onClick={() => removeCartItem(index)}
                          >
                            X
                          </Button>
                        </Box>
                      ))}
                      <Button
                        onClick={addCartItem}
                        variant="outlined"
                        fullWidth
                        sx={{ borderRadius: "10px", fontWeight: "bold" }}
                      >
                        + AGREGAR OTRO PRODUCTO
                      </Button>
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={toggleSaleForm} color="inherit">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    sx={{ borderRadius: "12px", fontWeight: "bold" }}
                  >
                    Confirmar Venta
                  </Button>
                </DialogActions>
              </form>
            </Dialog>
          </Container>
        </Box>
      </Box>
      {/* 📦 MODAL: DETALLES DE COMPONENTES DEL PACK */}
      <Dialog
        open={Boolean(viewPackDetails)}
        onClose={handleClosePackDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#111C44" }}>
          Contenido del {viewPackDetails?.name}
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Imagen</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Insumo</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Cant. Requerida
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    Stock Actual
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewPackDetails?.pack_items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Avatar
                        src={
                          item.component?.image_url ||
                          "https://via.placeholder.com/40?text=No+Img"
                        }
                        variant="rounded"
                        sx={{
                          width: 40,
                          height: 40,
                          border: "1px solid #eee",
                        }}
                      />
                    </TableCell>
                    <TableCell>{item.component?.name}</TableCell>
                    <TableCell align="center">{item.quantity} un.</TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color:
                          item.component?.stock < item.quantity
                            ? "error.main"
                            : "inherit",
                        fontWeight: "bold",
                      }}
                    >
                      {item.component?.stock} un.
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClosePackDetails}
            variant="contained"
            sx={{ borderRadius: "8px" }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔔 NOTIFICACIONES GLOBALES */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px", fontWeight: "bold" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 🔍 MODAL: DETALLE COMPLETO DEL PEDIDO */}
      <Dialog
        open={Boolean(viewOrderDetails)}
        onClose={handleCloseOrderDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Detalle del Pedido #{viewOrderDetails?.id.split("-")[0]}
          <Chip
            label={viewOrderDetails?.status}
            color="primary"
            variant="outlined"
            size="small"
          />
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Columna 1: Datos del Cliente */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                INFORMACIÓN DEL CLIENTE
              </Typography>
              <Typography variant="body1">
                <strong>Nombre:</strong> {viewOrderDetails?.customer_name}
              </Typography>
              <Typography variant="body1">
                <strong>RRSS:</strong> {viewOrderDetails?.social_handle} (
                {viewOrderDetails?.social_platform})
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                <strong>LOGÍSTICA:</strong>
              </Typography>
              <Typography variant="body1">
                <strong>Método:</strong> {viewOrderDetails?.delivery_method}
              </Typography>
              <Typography variant="body1">
                <strong>Comuna:</strong> {viewOrderDetails?.commune}
              </Typography>
            </Grid>

            {/* Columna 2: Tabla de Productos Comprados */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                PRODUCTOS COMPRADOS
              </Typography>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: "12px" }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="center">Cant.</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewOrderDetails?.items.map(
                      (item: OrderItem, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {item.product?.name || "Cargando..."}
                          </TableCell>
                          <TableCell align="center">
                            {item.quantity} un.
                          </TableCell>
                          <TableCell align="right">
                            $
                            {(item.price * item.quantity).toLocaleString(
                              "es-CL",
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                    <TableRow>
                      <TableCell colSpan={2} align="right">
                        <strong>Costo Envío:</strong>
                      </TableCell>
                      <TableCell align="right">
                        $
                        {viewOrderDetails?.delivery_cost.toLocaleString(
                          "es-CL",
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={2} align="right">
                        <strong>TOTAL FINAL:</strong>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: "bold", color: "primary.main" }}
                      >
                        $
                        {viewOrderDetails?.total_amount.toLocaleString("es-CL")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseOrderDetails}
            variant="contained"
            sx={{ borderRadius: "8px" }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;

// Actualizamos la interface
interface DashboardProps {
  stats: DashboardData | null;
  onRangeChange: (start: string, end: string) => void; // Nueva prop para manejar el cambio de rango
  currentRange: string; // Prop para saber qué rango está activo (ej: "7d", "30d", "custom", etc.)
  dateRange: { start: string; end: string }; // Prop para el rango de fechas actual
}

interface PieDataItem {
  name: string;
  value: number;
}

const COLORS = ["#4318FF", "#05CD99", "#FFB547", "#E1306C", "#011627"];

const CustomPieChart = ({
  title,
  data,
}: {
  title: string;
  data: PieDataItem[];
}) => {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: "20px",
        height: "400px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: "bold", color: "#1B2559" }}
      >
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false} // Quitamos la línea para que el número flote cerca
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" align="center" />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
};

const TrendIndicator = ({ value, label }: { value: number; label: string }) => {
  const isPositive = value >= 0;
  return (
    <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, gap: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          color: isPositive ? "secondary.main" : "error.main", // Verde o Rojo
        }}
      >
        {isPositive ? "▲" : "▼"} {Math.abs(value)}%
      </Typography>
      <Typography variant="caption" color="text.secondary">
        vs {label}
      </Typography>
    </Box>
  );
};

const BusinessInsights = ({ stats }: { stats: DashboardData }) => {
  // 1. Lógica de interpretación con seguridad de tipos
  const bestPlatform =
    stats.platformChart?.length > 0
      ? [...stats.platformChart].sort((a, b) => b.value - a.value)[0]
      : null;

  const isGrowing = stats.kpis.varIngresos >= 0;

  // Si no hay pedidos, no mostramos el cuadro para no ensuciar la vista
  if (stats.kpis.pedidosTotales === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: "20px",
        bgcolor: "rgba(67, 24, 255, 0.03)", // Un azul muy sutil
        border: "1px solid #E2E8F0",
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontWeight: "bold", mb: 2, color: "#1B2559", fontSize: "1.1rem" }}
      >
        Resumen de Rendimiento
      </Typography>

      <List disablePadding>
        {/* Tendencia de Ventas */}
        <ListItem sx={{ px: 0, py: 1 }}>
          <ListItemText
            primary={
              <Typography
                variant="body1"
                sx={{ fontWeight: "bold", color: "#2B3674" }}
              >
                Las ventas han {isGrowing ? "aumentado" : "disminuido"} un{" "}
                {Math.abs(stats.kpis.varIngresos)}% en este periodo.
              </Typography>
            }
            secondary={
              isGrowing
                ? "El ritmo de crecimiento es positivo respecto al periodo anterior."
                : "Se recomienda revisar la estrategia de captación."
            }
          />
        </ListItem>

        {/* Plataforma Principal */}
        {bestPlatform && (
          <ListItem sx={{ px: 0, py: 1 }}>
            <ListItemText
              primary={
                <Typography
                  variant="body1"
                  sx={{ fontWeight: "bold", color: "#2B3674" }}
                >
                  {bestPlatform.name} representa la mayor fuente de ingresos.
                </Typography>
              }
              secondary={`Esta plataforma genera el ${((bestPlatform.value / stats.kpis.pedidosTotales) * 100).toFixed(0)}% del volumen total de pedidos.`}
            />
          </ListItem>
        )}

        {/* Producto Líder */}
        <ListItem sx={{ px: 0, py: 1 }}>
          <ListItemText
            primary={
              <Typography
                variant="body1"
                sx={{ fontWeight: "bold", color: "#2B3674" }}
              >
                Producto líder: {stats.topProducts[0]?.name || "N/A"}
              </Typography>
            }
            secondary="Es el artículo con mayor rotación de stock actualmente."
          />
        </ListItem>
      </List>
    </Paper>
  );
};

const DashboardView = ({
  stats,
  onRangeChange,
  currentRange,
  dateRange,
}: DashboardProps) => {
  const ranges = getDateRanges();
  if (!stats) return <Typography>Cargando estadísticas...</Typography>;

  return (
    <Box>
      {/* 📅 CABECERA Y FILTROS */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          gap: 2,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#111C44" }}>
          Resumen General
        </Typography>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            variant={currentRange === "today" ? "contained" : "outlined"}
            onClick={() => onRangeChange(ranges.today, ranges.today)}
          >
            Hoy
          </Button>
          <Button
            variant={currentRange === "week" ? "contained" : "outlined"}
            onClick={() => onRangeChange(ranges.week, ranges.today)}
          >
            Semana
          </Button>
          <Button
            variant={currentRange === "month" ? "contained" : "outlined"}
            onClick={() => onRangeChange(ranges.month, ranges.today)}
          >
            Mes
          </Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <TextField
            label="Desde"
            type="date"
            size="small"
            value={dateRange.start}
            onChange={(e) => onRangeChange(e.target.value, dateRange.end)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            value={dateRange.end}
            onChange={(e) => onRangeChange(dateRange.start, e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
        </Box>
      </Box>

      {/* 💳 FILA DE 6 KPIs - Alineados perfectamente */}
      <Grid container spacing={2} sx={{ mb: 4, alignItems: "stretch" }}>
        {/* 1. INGRESOS REALES */}
        <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex" }}>
          <Card
            sx={{
              borderRadius: "16px",
              borderLeft: "5px solid #4318FF",
              width: "100%",
              height: "100%",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold" }}
              >
                INGRESOS
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                ${stats.kpis.ingresosReales.toLocaleString("es-CL")}
              </Typography>
              <TrendIndicator
                value={stats.kpis.varIngresos}
                label="periodo ant."
              />
            </CardContent>
          </Card>
        </Grid>

        {/* 2. PEDIDOS TOTALES */}
        <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex" }}>
          <Card
            sx={{
              borderRadius: "16px",
              borderLeft: "5px solid #673ab7",
              width: "100%",
              height: "100%",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold" }}
              >
                PEDIDOS
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                {stats.kpis.pedidosTotales}
              </Typography>
              <TrendIndicator
                value={stats.kpis.varPedidos}
                label="periodo ant."
              />
            </CardContent>
          </Card>
        </Grid>

        {/* 3. GANANCIA REAL (Utilidad) */}
        <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex" }}>
          <Card
            sx={{
              borderRadius: "16px",
              borderLeft: "5px solid #00CABE",
              width: "100%",
              height: "100%",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold" }}
              >
                GANANCIA REAL
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", mt: 0.5, color: "secondary.main" }}
              >
                ${stats.kpis.gananciaReal.toLocaleString("es-CL")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Venta - Costos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. TICKET PROMEDIO */}
        <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex" }}>
          <Card
            sx={{
              borderRadius: "16px",
              borderLeft: "5px solid #9c27b0",
              width: "100%",
              height: "100%",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold" }}
              >
                TICKET PROM.
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                ${Math.round(stats.kpis.ticketPromedio).toLocaleString("es-CL")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Promedio por venta
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 5. INVERSIÓN STOCK */}
        <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex" }}>
          <Card
            sx={{
              borderRadius: "16px",
              borderLeft: "5px solid #f59e0b",
              width: "100%",
              height: "100%",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold" }}
              >
                INVERSIÓN
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                ${stats.kpis.inversionStock.toLocaleString("es-CL")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Valor costo bodega
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 6. GANANCIA PROYECTADA */}
        <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex" }}>
          <Card
            sx={{
              borderRadius: "16px",
              borderLeft: "5px solid #05CD99",
              width: "100%",
              height: "100%",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold" }}
              >
                GANANCIA PROYECTADA
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                ${stats.kpis.gananciaProyectada.toLocaleString("es-CL")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Utilidad si se vende todo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 4 }}>
        <BusinessInsights stats={stats} />
      </Box>

      {/* 📊 SECCIÓN DE GRÁFICOS */}
      <Grid container spacing={4}>
        {/* Tendencia Lineal (8 columnas) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: "20px", height: "400px" }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Tendencia de Ventas
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={stats.salesChart}
                margin={{ right: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={(value) => `$${value.toLocaleString("es-CL")}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `$${Number(value).toLocaleString("es-CL")}`,
                    "Ventas Totales",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#4318FF"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Productos (4 columnas) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: "20px", height: "400px" }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Top 5 Productos
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={stats.topProducts} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  fontSize={12}
                />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="qty" fill="#05CD99" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* 🚀 AQUÍ USAMOS EL CustomPieChart (Ya no dará error) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <CustomPieChart
            title="Ventas por Plataforma"
            data={stats.platformChart}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <CustomPieChart
            title="Métodos de Entrega"
            data={stats.deliveryChart}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

// 1. Primero actualizamos la interfaz para que acepte "onAdd"
interface InventoryProps {
  products: Product[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onOpenPack: (product: Product) => void;
  onAdd: () => void; // 🚀 Prop para abrir el formulario
}

// 2. Componente con el botón y la confirmación
const InventoryView = ({
  products,
  searchTerm,
  setSearchTerm,
  onEdit,
  onDelete,
  onToggle,
  onOpenPack,
  onAdd, // 👈 Recibimos la función
}: InventoryProps) => (
  <Box>
    {/* 📋 CABECERA: Buscador + Botón Nuevo */}
    <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
      <TextField
        fullWidth
        placeholder="Buscar set de One Direction..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{
          bgcolor: "white",
          borderRadius: "12px",
          "& .MuiOutlinedInput-root": { borderRadius: "12px" },
        }}
      />
      <Button
        variant="contained"
        onClick={onAdd}
        sx={{
          whiteSpace: "nowrap",
          borderRadius: "12px",
          px: 3,
          py: 1.5,
          fontWeight: "bold",
          textTransform: "none",
          boxShadow: "0px 4px 12px rgba(67, 24, 255, 0.2)",
        }}
      >
        + Nuevo Producto
      </Button>
    </Box>

    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: "16px",
        border: "1px solid #E2E8F0",
        overflow: "hidden",
      }}
    >
      <Table>
        <TableHead sx={{ backgroundColor: "#F4F7FE" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold", color: "#A3AED0" }}>
              IMAGEN
            </TableCell>
            <TableCell sx={{ fontWeight: "bold", color: "#A3AED0" }}>
              PRODUCTO
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              STOCK
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              ESTADO
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              ACTIVO
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              PRECIO VENTA
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              ACCIONES
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                No hay productos registrados.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow
                key={product.id}
                hover
                sx={{ opacity: product.is_active ? 1 : 0.6 }}
              >
                <TableCell>
                  <Avatar
                    src={
                      product.image_url ||
                      "https://via.placeholder.com/50?text=1D"
                    }
                    variant="rounded"
                    sx={{ width: 50, height: 50, border: "1px solid #eee" }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: "500", color: "text.primary" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {product.name}
                    {product.is_pack && (
                      <Chip
                        label="PACK"
                        size="small"
                        onClick={() => onOpenPack(product)}
                        sx={{
                          bgcolor: "#4318FF",
                          color: "white",
                          fontWeight: "bold",
                          height: "20px",
                          fontSize: "0.6rem",
                          cursor: "pointer",
                        }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  {product.stock} un.
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={
                      product.stock > (product.min_stock || 2)
                        ? "Suficiente"
                        : "Stock Bajo"
                    }
                    color={
                      product.stock > (product.min_stock || 2)
                        ? "success"
                        : "warning"
                    }
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={product.is_active}
                    onChange={() => onToggle(product.id)}
                    color="success"
                  />
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "500" }}>
                  ${product.price_sale.toLocaleString("es-CL")}
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    sx={{ mr: 1, fontWeight: "bold" }}
                    onClick={() => onEdit(product)}
                  >
                    Editar
                  </Button>

                  {/* 🛡️ BOTÓN ELIMINAR CON CONFIRMACIÓN */}
                  <Button
                    size="small"
                    color="error"
                    sx={{ fontWeight: "bold" }}
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Estás seguro de eliminar "${product.name}"? Esta acción no se puede deshacer.`,
                        )
                      ) {
                        onDelete(product.id);
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

// 1. Interfaz actualizada con las nuevas funciones
interface OrdersProps {
  orders: Order[];
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onAdd: () => void; // 🚀 Para abrir el formulario de nueva venta
  onViewDetails: (order: Order) => void; // 🚀 Para ver qué lleva el pedido
}

// 2. Componente con botón de registro y acciones de tabla
const OrdersView = ({
  orders,
  onStatusChange,
  onAdd,
  onViewDetails,
}: OrdersProps) => (
  <Box>
    {/* 📋 CABECERA DE PEDIDOS */}
    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
      <Button
        variant="contained"
        color="secondary"
        onClick={onAdd}
        sx={{
          borderRadius: "12px",
          px: 4,
          py: 1.5,
          fontWeight: "bold",
          textTransform: "none",
          boxShadow: "0px 4px 12px rgba(104, 31, 255, 0.2)",
        }}
      >
        + Registrar Venta
      </Button>
    </Box>

    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: "16px",
        border: "1px solid #E2E8F0",
        overflow: "hidden",
      }}
    >
      <Table>
        <TableHead sx={{ backgroundColor: "#F4F7FE" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold", color: "#A3AED0" }}>
              CLIENTE
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              TOTAL
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              ESTADO
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: "bold", color: "#A3AED0" }}
            >
              ACCIONES
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                No hay ventas registradas.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell sx={{ fontWeight: "500", color: "text.primary" }}>
                  {order.customer_name}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold", color: "primary.main" }}
                >
                  ${order.total_amount.toLocaleString("es-CL")}
                </TableCell>
                <TableCell align="center">
                  <Select
                    value={order.status}
                    size="small"
                    onChange={(e) => onStatusChange(order.id, e.target.value)}
                    sx={{
                      minWidth: 130,
                      fontSize: "0.85rem",
                      borderRadius: "8px",
                    }}
                  >
                    <MenuItem value="PROCESO">PROCESO</MenuItem>
                    <MenuItem value="ABONADO">ABONADO</MenuItem>
                    <MenuItem value="PAGADO">PAGADO</MenuItem>
                    <MenuItem value="ENTREGADO">ENTREGADO</MenuItem>
                  </Select>
                </TableCell>
                <TableCell align="center">
                  {/* 🔍 BOTÓN DE ACCIÓN PARA EL DETALLE */}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onViewDetails(order)}
                    sx={{
                      borderRadius: "8px",
                      fontWeight: "bold",
                      textTransform: "none",
                    }}
                  >
                    Ver Detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);
