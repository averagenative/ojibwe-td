# Open Firewall for Mobile Dev Testing

WSL2 mirrored networking + Vite `--host` binds to all interfaces.
Only missing piece is Windows Firewall.

## Open port (elevated PowerShell)

```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

## Access from phone

Same WiFi, go to: `http://192.168.88.60:3001`

(Check IP with `ipconfig` if it changes.)

## Remove rule later

```powershell
Remove-NetFirewallRule -DisplayName "Vite Dev Server"
```
