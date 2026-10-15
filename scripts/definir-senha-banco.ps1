# Pede a senha do banco (digitação oculta) e grava no .env no lugar de [YOUR-PASSWORD].
# A senha é codificada para URL, então caracteres como @ # / ? % funcionam.
$envFile = Join-Path $PSScriptRoot "..\.env"
$content = Get-Content $envFile -Raw
if ($content -notmatch '\[YOUR-PASSWORD\]') {
    Write-Host "O .env não tem mais [YOUR-PASSWORD]. Nada a fazer." -ForegroundColor Yellow
    exit
}
$secure = Read-Host "Senha do banco da Supabase" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ([string]::IsNullOrWhiteSpace($plain)) { Write-Host "Senha vazia, nada foi alterado." -ForegroundColor Red; exit 1 }
$encoded = [uri]::EscapeDataString($plain.Trim())
$content = $content.Replace('[YOUR-PASSWORD]', $encoded)
[IO.File]::WriteAllText((Resolve-Path $envFile), $content, (New-Object Text.UTF8Encoding $false))
Write-Host "Senha gravada no .env." -ForegroundColor Green
