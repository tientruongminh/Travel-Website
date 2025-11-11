import geopandas as gpd
import matplotlib.pyplot as plt

# Đọc dữ liệu GeoJSON
gdf = gpd.read_file("/workspaces/Travel-Website/data/quangninh.geojson")

# Xem thử cột nào chứa tên xã/phường (in 5 dòng đầu để kiểm tra)
print(gdf.columns)
print(gdf.head())

# Vẽ bản đồ với màu theo từng xã/phường
fig, ax = plt.subplots(figsize=(10, 10))

# Nếu trong cột có tên là 'TEN_XA' hoặc 'NAME_3' hoặc tương tự, bạn chọn cột đó
# Ví dụ: column_name = "TEN_XA"
column_name = "TEN_XA" if "TEN_XA" in gdf.columns else gdf.columns[0]

gdf.plot(
    ax=ax,
    column=column_name,         # tô màu theo tên xã
    cmap="tab20",               # bảng màu rực rỡ (bạn có thể thử 'Set3', 'Accent', 'Paired')
    edgecolor="black",          # viền ranh giới
    linewidth=0.5,
    legend=False                # nếu muốn thêm chú thích thì đổi thành True
)

# Trang trí
ax.set_title("Bản đồ hành chính tỉnh Quảng Ninh (phường/xã)", fontsize=14)
ax.axis("off")

# Lưu ảnh
plt.savefig("/workspaces/Travel-Website/quangninh_map_colored.png", dpi=300, bbox_inches='tight')

plt.show()
