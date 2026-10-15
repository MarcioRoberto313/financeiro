# Publica o app na Vercel: login, criação/vínculo do projeto, variáveis de ambiente e deploy.
# As variáveis são lidas do .env e enviadas direto para a Vercel, sem aparecer na tela.
# Erros de comandos externos são checados por $LASTEXITCODE (o PowerShell 5.1 trata stderr como erro).
$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Step "1/4 Login na Vercel (vai abrir o navegador; entre com sua conta ou crie uma grátis)"
npx --yes vercel@latest login
if ($LASTEXITCODE -ne 0) { throw "Login não concluído." }

Step "2/4 Criando/vinculando o projeto 'financeiro'"
npx --yes vercel@latest link --yes --project financeiro
if ($LASTEXITCODE -ne 0) { throw "Não foi possível vincular o projeto." }

Step "3/4 Enviando variáveis de ambiente (produção)"
$vars = @{}
foreach ($line in Get-Content .env) {
    if ($line -match '^\s*(DATABASE_URL|DIRECT_URL)\s*=\s*"?(.*?)"?\s*$') { $vars[$Matches[1]] = $Matches[2] }
}
if (-not $vars.DATABASE_URL -or -not $vars.DIRECT_URL) { throw "DATABASE_URL/DIRECT_URL não encontradas no .env." }
# Segredo de sessão novo e exclusivo da produção
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$vars["SESSION_SECRET"] = [Convert]::ToBase64String($bytes)

foreach ($name in "DATABASE_URL", "DIRECT_URL", "SESSION_SECRET") {
    # Remove o valor antigo, se houver (falha silenciosa na primeira vez)
    cmd /c "npx --yes vercel@latest env rm $name production --yes >nul 2>&1"
    $vars[$name] | npx --yes vercel@latest env add $name production | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Falha ao gravar $name." }
    Write-Host "   $name ok"
}

Step "4/4 Publicando (leva 1 a 3 minutos)"
npx --yes vercel@latest deploy --prod --yes
if ($LASTEXITCODE -ne 0) { throw "O deploy falhou. Veja a mensagem acima." }

Write-Host "`nPronto! O endereço do app é a linha 'Production:' / 'Aliased:' acima." -ForegroundColor Green
