"""Prepara as telas reais do CRM Farmácia Preço Bom (prints enviados pelo cliente) para o comercial.

LGPD: os prints trazem dados pessoais de clientes da farmácia (nomes, fotos, telefones, endereço e
medicamentos = dado de saúde). Tudo isso é desfocado aqui ANTES de entrar no vídeo. Também cortamos
a barra de título/tarefas do Windows e a barra de rolagem.

Uso: python3 scripts/redact_crm.py <pasta_com_prints>
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

SRC = sys.argv[1]
OUT = "assets/captures/crm_real"
CROP = (0, 26, 1424, 858)  # remove título da janela (y<26), taskbar (y>858) e scrollbar (x>1424)


def redact(im, boxes, radius=9, pixel=7):
    im = im.copy()
    for (x0, y0, x1, y1) in boxes:
        reg = im.crop((x0, y0, x1, y1))
        w, h = reg.size
        reg = reg.resize((max(1, w // pixel), max(1, h // pixel)), Image.BILINEAR).resize((w, h), Image.BILINEAR)
        reg = reg.filter(ImageFilter.GaussianBlur(radius))
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=min(10, h // 2), fill=255)
        im.paste(reg, (x0, y0), mask)
    return im


rows = [220 + 73 * i for i in range(9)]
JOBS = {
    # Chat ao vivo: avatares + nomes dos contatos, e o texto da mensagem (nome + medicamento)
    "4.webp": ("crm_chat.png", [b for y in rows for b in [(114, y, 166, y + 46), (166, y + 2, 345, y + 26)]] + [(684, 300, 1362, 348)]),
    # Dashboard: valores de faturamento/vendas (sigilo comercial)
    "5.webp": ("crm_dashboard.png", [(x + 14, 150, x + 200, 192) for x in (100, 427, 755, 1082)] + [(x + 14, 360, x + 200, 400) for x in (100, 427, 755, 1082)]),
    # Campanhas: sem dados pessoais
    "6.png": ("crm_campanhas.png", []),
    # Pedidos: nomes, itens (medicamentos), endereço e telefones
    "7.png": ("crm_pedidos.png", [(150, 312, 312, 336), (130, 360, 390, 412), (132, 428, 392, 448), (132, 448, 262, 468),
                                  (150, 585, 312, 609), (130, 634, 390, 672), (132, 681, 262, 701)]),
    # Encomendas: nome, medicamento, telefone; no widget da IA, a pergunta de teste e a mensagem de erro
    "8.png": ("crm_encomendas.png", [(592, 393, 712, 416), (580, 446, 942, 476), (572, 488, 700, 508), (1250, 524, 1392, 566), (1038, 688, 1335, 710)]),
}

for src, (dst, boxes) in JOBS.items():
    im = Image.open(f"{SRC}/{src}").convert("RGB")
    im = redact(im, boxes).crop(CROP)
    im.save(f"{OUT}/{dst}", optimize=True)
    print("✔", dst, im.size, f"{len(boxes)} áreas desfocadas")
