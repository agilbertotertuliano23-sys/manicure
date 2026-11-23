<?php
/* Recebe o PNG do visual montado na hero 3D (corpo da requisição) e guarda em visuais/.
   Devolve {"url":"visuais/<nome>.png"} para o link entrar na mensagem do WhatsApp da profissional.
   Só aceita PNG de verdade (confere o conteúdo, não só o cabeçalho), até 4 MB, e apaga o que tem mais de 30 dias. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function falhar(int $codigo, string $msg): void {
  http_response_code($codigo);
  echo json_encode(['erro' => $msg]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') falhar(405, 'use POST');

$max = 4 * 1024 * 1024;
$dados = file_get_contents('php://input', false, null, 0, $max + 1);
if ($dados === false || $dados === '') falhar(400, 'imagem vazia');
if (strlen($dados) > $max) falhar(413, 'imagem grande demais');

/* assinatura PNG + decodificação real: recusa qualquer coisa que não seja imagem */
if (substr($dados, 0, 8) !== "\x89PNG\r\n\x1a\n") falhar(415, 'só PNG');
$info = @getimagesizefromstring($dados);
if (!$info || $info[2] !== IMAGETYPE_PNG || $info[0] < 100 || $info[1] < 100 || $info[0] > 4000 || $info[1] > 4000) falhar(415, 'imagem inválida');

$pasta = __DIR__ . '/visuais';
if (!is_dir($pasta) && !@mkdir($pasta, 0755, true)) falhar(500, 'sem pasta');
/* a pasta só serve imagens: nada executa lá dentro */
$ht = $pasta . '/.htaccess';
if (!file_exists($ht)) {
  @file_put_contents($ht, "Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .php5\n<FilesMatch \"\\.(?!png$)[^.]+$\">\n  Require all denied\n</FilesMatch>\n");
}

/* limite simples por visitante: no máximo 12 envios por hora */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$marca = $pasta . '/.lim-' . substr(hash('sha256', $ip), 0, 16);
$agora = time();
$envios = [];
if (is_file($marca)) {
  foreach (explode("\n", (string) @file_get_contents($marca)) as $t) if ((int) $t > $agora - 3600) $envios[] = (int) $t;
}
if (count($envios) >= 12) falhar(429, 'muitos envios, tente mais tarde');
$envios[] = $agora;
@file_put_contents($marca, implode("\n", $envios), LOCK_EX);

$nome = bin2hex(random_bytes(10)) . '.png';
if (@file_put_contents($pasta . '/' . $nome, $dados, LOCK_EX) === false) falhar(500, 'não foi possível salvar');

/* limpeza ocasional: imagens com mais de 30 dias e controles com mais de 1 dia */
if (random_int(1, 20) === 1) {
  foreach (glob($pasta . '/*.png') ?: [] as $f) if (@filemtime($f) < $agora - 30 * 86400) @unlink($f);
  foreach (glob($pasta . '/.lim-*') ?: [] as $f) if (@filemtime($f) < $agora - 86400) @unlink($f);
}

echo json_encode(['url' => 'visuais/' . $nome]);
