using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Media;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

internal static class SheepStoreGameLauncher
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new SheepStoreGameForm());
    }
}

internal sealed class SheepStoreGameForm : Form
{
    private const string WebsiteUrl = "https://sheep-store-web.ovejanegraservices.workers.dev";
    private readonly SheepStoreGameSurface game;
    private readonly SoundPlayer jumpPlayer;
    private readonly MemoryStream jumpStream;
    private readonly MemoryStream musicStream;
    private SoundPlayer musicPlayer;
    private bool musicEnabled = true;
    private bool jumpSoundEnabled = true;

    public SheepStoreGameForm()
    {
        Text = "CORRE OVEJITA · Sheep Store";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1024, 576);
        MinimumSize = new Size(820, 500);
        BackColor = Color.FromArgb(244, 244, 242);
        KeyPreview = true;
        Icon = LoadGameIcon();

        game = new SheepStoreGameSurface();
        game.Dock = DockStyle.Fill;
        game.SoundChanged += ToggleGameSound;
        game.Jumped += PlayJumpSound;
        game.MusicChanged += ToggleBackgroundMusic;
        game.FormClosedRequest += delegate { Close(); };

        Button websiteButton = new Button();
        websiteButton.Text = "NUESTRA PÁGINA WEB";
        websiteButton.Dock = DockStyle.Bottom;
        websiteButton.Height = 36;
        websiteButton.FlatStyle = FlatStyle.Flat;
        websiteButton.FlatAppearance.BorderSize = 0;
        websiteButton.BackColor = Color.FromArgb(29, 29, 29);
        websiteButton.ForeColor = Color.White;
        websiteButton.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        websiteButton.Cursor = Cursors.Hand;
        websiteButton.Click += OpenWebsite;

        Controls.Add(game);
        Controls.Add(websiteButton);
        jumpStream = new MemoryStream(CreateJumpWave());
        jumpPlayer = new SoundPlayer(jumpStream);
        jumpPlayer.Load();
        musicStream = new MemoryStream(CreateMusicWave());

        Shown += StartBackgroundMusic;
        KeyDown += HandleGameKey;
        FormClosing += SaveRecord;
        FormClosed += CloseAudio;
    }

    private void OpenWebsite(object sender, EventArgs eventArgs)
    {
        try
        {
            Process.Start(new ProcessStartInfo(WebsiteUrl) { UseShellExecute = true });
        }
        catch (System.ComponentModel.Win32Exception error)
        {
            MessageBox.Show(
                "No se pudo abrir la página web.\r\n\r\n" + error.Message,
                "Sheep Store",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
        catch (InvalidOperationException error)
        {
            MessageBox.Show(
                "No se pudo abrir la página web.\r\n\r\n" + error.Message,
                "Sheep Store",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
    }

    private static Icon LoadGameIcon()
    {
        Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("assets/programs/SHEEP_STORE_RUN.ico");
        if (stream == null)
        {
            throw new InvalidOperationException("No se encontró el icono del juego.");
        }

        using (stream)
        {
            return new Icon(stream);
        }
    }

    private void HandleGameKey(object sender, KeyEventArgs eventArgs)
    {
        if (eventArgs.KeyCode == Keys.Space || eventArgs.KeyCode == Keys.Up)
        {
            eventArgs.Handled = true;
            eventArgs.SuppressKeyPress = true;
            game.Jump();
        }
        else if (eventArgs.KeyCode == Keys.P || eventArgs.KeyCode == Keys.Escape)
        {
            game.TogglePause();
        }
        else if (eventArgs.KeyCode == Keys.R)
        {
            game.Restart();
        }
    }

    private void PlayJumpSound(object sender, EventArgs eventArgs)
    {
        if (jumpSoundEnabled)
        {
            jumpPlayer.Play();
        }
    }

    private void ToggleGameSound(object sender, EventArgs eventArgs)
    {
        jumpSoundEnabled = !jumpSoundEnabled;
        game.JumpSoundEnabled = jumpSoundEnabled;
    }

    private void StartBackgroundMusic(object sender, EventArgs eventArgs)
    {
        try
        {
            musicPlayer = new SoundPlayer(musicStream);
            musicPlayer.Load();
            if (musicEnabled)
            {
                musicPlayer.PlayLooping();
            }
        }
        catch (InvalidOperationException error)
        {
            musicEnabled = false;
            game.SetAudioStatus("No se pudo iniciar la música: " + error.Message);
        }
        catch (IOException error)
        {
            musicEnabled = false;
            game.SetAudioStatus("No se pudo iniciar la música: " + error.Message);
        }
    }

    private void ToggleBackgroundMusic(object sender, EventArgs eventArgs)
    {
        musicEnabled = !musicEnabled;
        if (musicPlayer == null)
        {
            if (musicEnabled)
            {
                StartBackgroundMusic(this, EventArgs.Empty);
            }
            return;
        }

        if (musicEnabled)
        {
            musicPlayer.PlayLooping();
        }
        else
        {
            musicPlayer.Stop();
        }
    }

    private void SaveRecord(object sender, FormClosingEventArgs eventArgs)
    {
        if (game.RecordDirty)
        {
            game.SaveRecord();
        }
    }

    private void CloseAudio(object sender, FormClosedEventArgs eventArgs)
    {
        game.StopGame();
        if (musicPlayer != null)
        {
            musicPlayer.Stop();
            musicPlayer.Dispose();
        }
        jumpPlayer.Stop();
        jumpPlayer.Dispose();
        jumpStream.Dispose();
        musicStream.Dispose();
        game.DisposeAssets();
    }

    private static byte[] CreateJumpWave()
    {
        const int sampleRate = 22050;
        const int sampleCount = 3308;
        short[] samples = new short[sampleCount];
        for (int index = 0; index < sampleCount; index++)
        {
            double time = (double)index / sampleRate;
            double progress = time / ((double)sampleCount / sampleRate);
            double frequency = 540 - 180 * progress;
            double envelope = Math.Sin(Math.PI * progress) * Math.Exp(-3.1 * progress);
            samples[index] = (short)(Math.Sin(2 * Math.PI * frequency * time) * envelope * 5500);
        }
        return CreateWave(samples, sampleRate);
    }

    private static byte[] CreateMusicWave()
    {
        const int sampleRate = 22050;
        const double tempo = 82;
        const int beats = 16;
        double duration = beats * 60 / tempo;
        short[] samples = new short[(int)(duration * sampleRate)];
        int[][] chords =
        {
            new int[] { 60, 64, 67, 71 },
            new int[] { 57, 60, 64, 67 },
            new int[] { 53, 57, 60, 64 },
            new int[] { 55, 59, 62, 65 }
        };

        for (int index = 0; index < samples.Length; index++)
        {
            double time = (double)index / sampleRate;
            double beat = time * tempo / 60;
            int chord = ((int)(beat / 4)) % chords.Length;
            double fraction = beat - Math.Floor(beat);
            double envelope = Math.Min(1, time / 0.35) * Math.Min(1, (duration - time) / 0.35);
            double value = 0;
            for (int note = 0; note < 4; note++)
            {
                value += Math.Sin(2 * Math.PI * MidiToFrequency(chords[chord][note]) * time) * 0.0030;
            }

            value += Math.Sin(2 * Math.PI * MidiToFrequency(chords[chord][0] - 24) * time) * 0.0040;
            if (fraction < 0.20 && ((int)beat % 4 == 0 || (int)beat % 4 == 2))
            {
                value += Math.Sin(2 * Math.PI * (92 - fraction * 190) * time) * Math.Exp(-18 * fraction) * 0.008;
            }

            double halfBeat = Math.Abs(beat - Math.Round(beat * 2) / 2);
            if (halfBeat < 0.035)
            {
                value += Math.Sin(2 * Math.PI * 7600 * time) * (1 - halfBeat / 0.035) * 0.0015;
            }

            double warmth = 1 + 0.07 * Math.Sin(2 * Math.PI * 0.18 * time);
            samples[index] = (short)(Math.Max(-0.02, Math.Min(0.02, value * envelope * warmth)) * 32767);
        }

        return CreateWave(samples, sampleRate);
    }

    private static double MidiToFrequency(int note)
    {
        return 440 * Math.Pow(2, (note - 69) / 12.0);
    }

    private static byte[] CreateWave(short[] samples, int sampleRate)
    {
        using (MemoryStream stream = new MemoryStream())
        using (BinaryWriter writer = new BinaryWriter(stream, Encoding.ASCII))
        {
            int dataLength = samples.Length * 2;
            writer.Write(Encoding.ASCII.GetBytes("RIFF"));
            writer.Write(36 + dataLength);
            writer.Write(Encoding.ASCII.GetBytes("WAVE"));
            writer.Write(Encoding.ASCII.GetBytes("fmt "));
            writer.Write(16);
            writer.Write((short)1);
            writer.Write((short)1);
            writer.Write(sampleRate);
            writer.Write(sampleRate * 2);
            writer.Write((short)2);
            writer.Write((short)16);
            writer.Write(Encoding.ASCII.GetBytes("data"));
            writer.Write(dataLength);
            for (int index = 0; index < samples.Length; index++)
            {
                writer.Write(samples[index]);
            }
            return stream.ToArray();
        }
    }
}

internal sealed class SheepStoreGameSurface : Control
{
    private const float ViewWidth = 1360;
    private const float ViewHeight = 850;
    private const float GroundY = 708;
    private const float SheepX = 204;
    private const float SheepSize = 76;
    private const float LegLength = 17;
    private const int GameTop = 296;
    private const int GameBottom = 776;

    private readonly System.Windows.Forms.Timer timer;
    private readonly Stopwatch clock;
    private readonly Random random;
    private readonly List<GameObstacle> obstacles;
    private readonly List<GameCoin> coins;
    private readonly Bitmap sheepImage;
    private readonly Bitmap staticScene;
    private readonly Font tinyFont = new Font("Consolas", 9, FontStyle.Bold);
    private readonly Font smallFont = new Font("Segoe UI", 9, FontStyle.Regular);
    private readonly Font numberFont = new Font("Consolas", 16, FontStyle.Bold);
    private readonly Font logoFont = new Font("Consolas", 34, FontStyle.Bold);
    private float sheepY;
    private float sheepVelocity;
    private float distance;
    private float speed;
    private float nextObstacleX;
    private float nextCoinX;
    private long previousTick;
    private long lastRecordSave;
    private int score;
    private int best;
    private int coinsCollected;
    private bool running;
    private bool paused;
    private bool recordDirty;
    private bool musicOn = true;
    private bool jumpSoundOn = true;
    private string audioStatus = "";

    public event EventHandler Jumped;
    public event EventHandler SoundChanged;
    public event EventHandler MusicChanged;
    public event EventHandler FormClosedRequest;

    public bool JumpSoundEnabled
    {
        get { return jumpSoundOn; }
        set
        {
            jumpSoundOn = value;
            Invalidate();
        }
    }

    public bool RecordDirty
    {
        get { return recordDirty; }
    }

    public SheepStoreGameSurface()
    {
        DoubleBuffered = true;
        ResizeRedraw = true;
        TabStop = true;
        BackColor = Color.FromArgb(244, 244, 242);
        clock = Stopwatch.StartNew();
        random = new Random();
        obstacles = new List<GameObstacle>();
        coins = new List<GameCoin>();
        sheepImage = LoadLogo();
        staticScene = CreateStaticScene();
        LoadRecord();

        timer = new System.Windows.Forms.Timer();
        timer.Interval = 16;
        timer.Tick += AdvanceGame;
        StartGame();
    }

    private static Bitmap LoadLogo()
    {
        using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("assets/logo.png"))
        {
            if (stream == null)
            {
                throw new InvalidOperationException("No se encontró el logo de la oveja en el juego.");
            }

            using (Bitmap source = new Bitmap(stream))
            {
                Bitmap runner = new Bitmap(source);
                using (Graphics graphics = Graphics.FromImage(runner))
                using (SolidBrush background = new SolidBrush(Color.White))
                {
                    graphics.FillRectangle(background, 276, 558, 62, 126);
                    graphics.FillRectangle(background, 432, 558, 45, 126);
                }
                return runner;
            }
        }
    }

    public void SetAudioStatus(string status)
    {
        audioStatus = status;
        Invalidate();
    }

    public void StartGame()
    {
        distance = 0;
        speed = 380;
        score = 0;
        coinsCollected = 0;
        sheepY = GroundY - SheepSize - LegLength;
        sheepVelocity = 0;
        nextObstacleX = ViewWidth + 180;
        nextCoinX = ViewWidth + 440;
        obstacles.Clear();
        coins.Clear();
        running = true;
        paused = false;
        previousTick = clock.ElapsedMilliseconds;
        timer.Start();
        Invalidate();
        Focus();
    }

    public void Restart()
    {
        if (score > best)
        {
            best = score;
            recordDirty = true;
        }
        StartGame();
    }

    public void StopGame()
    {
        running = false;
        timer.Stop();
    }

    public void DisposeAssets()
    {
        sheepImage.Dispose();
        staticScene.Dispose();
        tinyFont.Dispose();
        smallFont.Dispose();
        numberFont.Dispose();
        logoFont.Dispose();
    }

    public void SaveRecord()
    {
        string folder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Sheep Store",
            "Corre Ovejita");
        string path = Path.Combine(folder, "record.txt");

        try
        {
            Directory.CreateDirectory(folder);
            File.WriteAllText(path, Math.Max(best, score).ToString(), Encoding.ASCII);
            recordDirty = false;
        }
        catch (IOException error)
        {
            ShowRecordError(error);
        }
        catch (UnauthorizedAccessException error)
        {
            ShowRecordError(error);
        }
    }

    public void TogglePause()
    {
        if (!running)
        {
            return;
        }
        paused = !paused;
        previousTick = clock.ElapsedMilliseconds;
        if (paused)
        {
            timer.Stop();
        }
        else
        {
            timer.Start();
        }
        Invalidate();
    }

    private void ToggleMusic()
    {
        musicOn = !musicOn;
        EventHandler handler = MusicChanged;
        if (handler != null)
        {
            handler(this, EventArgs.Empty);
        }
        Invalidate();
    }

    public void Jump()
    {
        if (!running || paused || sheepY < GroundY - SheepSize - LegLength)
        {
            return;
        }
        sheepVelocity = -675;
        EventHandler handler = Jumped;
        if (handler != null)
        {
            handler(this, EventArgs.Empty);
        }
        Invalidate();
    }

    protected override void OnMouseDown(MouseEventArgs eventArgs)
    {
        base.OnMouseDown(eventArgs);
        float scale = Math.Min((float)ClientSize.Width / ViewWidth, (float)ClientSize.Height / ViewHeight);
        float left = (ClientSize.Width - ViewWidth * scale) / 2;
        float top = (ClientSize.Height - ViewHeight * scale) / 2;
        PointF point = new PointF((eventArgs.X - left) / scale, (eventArgs.Y - top) / scale);

        if (PauseButton.Contains(point))
        {
            TogglePause();
        }
        else if (MusicButton.Contains(point))
        {
            ToggleMusic();
        }
        else if (SoundButton.Contains(point))
        {
            EventHandler soundHandler = SoundChanged;
            if (soundHandler != null)
            {
                soundHandler(this, EventArgs.Empty);
            }
        }
        else if (RestartButton.Contains(point))
        {
            Restart();
        }
        else if (CloseButton.Contains(point))
        {
            EventHandler closeHandler = FormClosedRequest;
            if (closeHandler != null)
            {
                closeHandler(this, EventArgs.Empty);
            }
        }
        else if (GameBounds.Contains(point))
        {
            if (paused)
            {
                TogglePause();
            }
            else if (!running)
            {
                Restart();
            }
            else
            {
                Jump();
            }
        }
    }

    protected override void OnPaint(PaintEventArgs eventArgs)
    {
        base.OnPaint(eventArgs);
        if (ClientSize.Width < 1 || ClientSize.Height < 1)
        {
            return;
        }

        Graphics graphics = eventArgs.Graphics;
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.InterpolationMode = InterpolationMode.HighQualityBilinear;
        float scale = Math.Min((float)ClientSize.Width / ViewWidth, (float)ClientSize.Height / ViewHeight);
        GraphicsState state = graphics.Save();
        graphics.TranslateTransform((ClientSize.Width - ViewWidth * scale) / 2, (ClientSize.Height - ViewHeight * scale) / 2);
        graphics.ScaleTransform(scale, scale);
        graphics.DrawImageUnscaled(staticScene, 0, 0);
        DrawHud(graphics);
        DrawGame(graphics);
        DrawFooter(graphics);
        graphics.Restore(state);
    }

    private Bitmap CreateStaticScene()
    {
        Bitmap scene = new Bitmap((int)ViewWidth, (int)ViewHeight);
        using (Graphics graphics = Graphics.FromImage(scene))
        {
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.Clear(Color.FromArgb(244, 244, 242));
            DrawRoundRect(graphics, White, new RectangleF(30, 22, 1300, 132), 17);
            DrawRoundRect(graphics, White, new RectangleF(30, 170, 1300, 94), 15);
            DrawRoundRect(graphics, White, GameBounds, 18);

            using (Pen border = new Pen(Border, 1))
            {
                graphics.DrawRoundedRectangle(border, new Rectangle(30, 22, 1300, 132), 17);
                graphics.DrawRoundedRectangle(border, new Rectangle(30, 170, 1300, 94), 15);
                graphics.DrawRoundedRectangle(border, Rectangle.Round(GameBounds), 18);
            }

            DrawHeader(graphics);
            DrawBackdrop(graphics);
            DrawCircuit(graphics);
        }
        return scene;
    }

    private void DrawHeader(Graphics graphics)
    {
        graphics.DrawImage(sheepImage, new Rectangle(55, 40, 93, 93));

        using (SolidBrush black = new SolidBrush(Ink))
        using (SolidBrush muted = new SolidBrush(Gray))
        using (Pen line = new Pen(Ink, 3))
        {
            graphics.DrawString("CORRE", logoFont, black, 180, 34);
            graphics.DrawString("OVEJITA", logoFont, black, 178, 78);
            graphics.DrawString("SHEEP STORE  /  SALTA, CORRE Y RECOGE MONEDAS", tinyFont, muted, 505, 71);
            graphics.DrawLine(line, 504, 104, 1241, 104);
            graphics.DrawLine(line, 1241, 104, 1262, 122);
            graphics.DrawLine(line, 1262, 122, 1294, 122);
            graphics.DrawEllipse(line, 1290, 118, 8, 8);
            DrawPixelMotionLines(graphics, 505, 53);
        }
    }

    private void DrawBackdrop(Graphics graphics)
    {
        using (SolidBrush sky = new SolidBrush(Color.FromArgb(250, 250, 248)))
        {
            graphics.FillRectangle(sky, 36, 302, 1288, 468);
        }

        Random decoration = new Random(41);
        for (int index = 0; index < 19; index++)
        {
            float x = 56 + decoration.Next(1225);
            float y = 328 + decoration.Next(287);
            if (Math.Abs(x - 1090) < 70 && Math.Abs(y - 390) < 35)
            {
                continue;
            }
            DrawCircuit(graphics, x, y, decoration.Next(65, 145), decoration.Next(0, 2) == 0 ? 1 : -1);
        }

        DrawCloud(graphics, 183, 415, 0.88f);
        DrawCloud(graphics, 622, 370, 0.94f);
        DrawCloud(graphics, 1047, 423, 0.75f);
        DrawRoundRect(graphics, Ink, new RectangleF(36, GroundY, 1288, 3), 0);
        graphics.FillRectangle(Brushes.Gainsboro, 36, GroundY + 4, 1288, 10);
        graphics.FillRectangle(Brushes.White, 36, GroundY + 14, 1288, 4);

        using (SolidBrush floor = new SolidBrush(Color.FromArgb(33, 33, 33)))
        {
            graphics.FillRectangle(floor, 36, GroundY + 18, 1288, 48);
        }
        using (SolidBrush pixel = new SolidBrush(Color.FromArgb(90, 177, 177, 177)))
        {
            for (int index = 0; index < 145; index++)
            {
                int x = 41 + decoration.Next(1270);
                int y = (int)GroundY + 22 + decoration.Next(40);
                int size = decoration.Next(3, 10);
                graphics.FillRectangle(pixel, x, y, size, size);
            }
        }
    }

    private void DrawCircuit(Graphics graphics)
    {
        DrawCircuit(graphics, 48, 421, 144, 1);
        DrawCircuit(graphics, 1278, 426, 130, -1);
        DrawCircuit(graphics, 608, 445, 178, 1);
    }

    private static void DrawCircuit(Graphics graphics, float x, float y, float length, int direction)
    {
        using (Pen wire = new Pen(Color.FromArgb(220, 225, 225, 222), 2))
        using (Pen accent = new Pen(Color.FromArgb(180, 194, 194, 190), 2))
        using (SolidBrush dot = new SolidBrush(Color.FromArgb(250, 250, 248)))
        {
            float end = x + length * direction;
            graphics.DrawLine(wire, x, y, x + length * 0.30f * direction, y);
            graphics.DrawLine(wire, x + length * 0.30f * direction, y, x + length * 0.48f * direction, y + 22);
            graphics.DrawLine(wire, x + length * 0.48f * direction, y + 22, end, y + 22);
            graphics.DrawLine(accent, x, y + 13, x + length * 0.22f * direction, y + 13);
            graphics.DrawLine(accent, x + length * 0.22f * direction, y + 13, x + length * 0.39f * direction, y + 36);
            graphics.DrawLine(accent, x + length * 0.39f * direction, y + 36, end - 16 * direction, y + 36);
            graphics.DrawEllipse(wire, x - 4, y - 4, 8, 8);
            graphics.DrawEllipse(accent, end - 4 * direction, y + 18, 8, 8);
            graphics.FillEllipse(dot, x - 1, y - 1, 2, 2);
        }
    }

    private static void DrawPixelMotionLines(Graphics graphics, float x, float y)
    {
        using (Pen pen = new Pen(Ink, 3))
        {
            graphics.DrawLine(pen, x, y, x + 24, y);
            graphics.DrawLine(pen, x + 12, y + 9, x + 41, y + 9);
            graphics.DrawLine(pen, x, y + 18, x + 17, y + 18);
        }
    }

    private static void DrawCloud(Graphics graphics, float x, float y, float scale)
    {
        using (Pen pen = new Pen(Color.FromArgb(176, 176, 173), 2))
        {
            graphics.DrawArc(pen, x, y + 11 * scale, 29 * scale, 25 * scale, 180, 180);
            graphics.DrawArc(pen, x + 15 * scale, y, 35 * scale, 37 * scale, 180, 180);
            graphics.DrawArc(pen, x + 40 * scale, y + 10 * scale, 31 * scale, 26 * scale, 180, 180);
            graphics.DrawLine(pen, x + 15 * scale, y + 31 * scale, x + 56 * scale, y + 31 * scale);
        }
    }

    private void DrawHud(Graphics graphics)
    {
        DrawButton(graphics, PauseButton, paused ? "▶" : "Ⅱ", paused ? "Reanudar partida" : "Pausar partida", true);
        DrawHudStat(graphics, 145, "DISTANCIA", FormatCounter(score));
        DrawHudStat(graphics, 612, "MEJOR", FormatCounter(best));
        DrawCoin(graphics, 1030, 191, 24, false, 0);
        using (SolidBrush label = new SolidBrush(Ink))
        {
            graphics.DrawString("MONEDAS", tinyFont, label, 1068, 185);
            graphics.DrawString(FormatCounter(coinsCollected), numberFont, label, 1068, 204);
        }
    }

    private void DrawHudStat(Graphics graphics, float x, string labelText, string value)
    {
        using (SolidBrush label = new SolidBrush(Gray))
        using (SolidBrush number = new SolidBrush(Ink))
        {
            graphics.DrawString(labelText, tinyFont, label, x, 184);
            graphics.DrawString(value, numberFont, number, x, 204);
        }
    }

    private void DrawGame(Graphics graphics)
    {
        GraphicsState clip = graphics.Save();
        graphics.SetClip(GameBounds);
        foreach (GameObstacle obstacle in obstacles)
        {
            DrawObstacle(graphics, obstacle);
        }
        foreach (GameCoin coin in coins)
        {
            DrawCoin(graphics, coin.X, coin.Y, 24, true, clock.ElapsedMilliseconds);
        }
        DrawSheep(graphics);
        graphics.Restore(clip);

        if (!running)
        {
            DrawOverlay(graphics, "¡BIEN CORRIDO!", "Distancia " + FormatCounter(score) + "     ·     Monedas " + FormatCounter(coinsCollected), "PULSA R O TOCA AQUÍ PARA VOLVER A JUGAR");
        }
        else if (paused)
        {
            DrawOverlay(graphics, "PAUSA", "Tómate un descanso, ¡la carrera te espera!", "PULSA P O TOCA AQUÍ PARA CONTINUAR");
        }
        if (!String.IsNullOrEmpty(audioStatus))
        {
            using (SolidBrush status = new SolidBrush(Color.FromArgb(173, 46, 46)))
            {
                graphics.DrawString(audioStatus, smallFont, status, 51, 745);
            }
        }
    }

    private void DrawOverlay(Graphics graphics, string title, string detail, string hint)
    {
        using (SolidBrush dim = new SolidBrush(Color.FromArgb(188, 250, 250, 248)))
        using (SolidBrush dark = new SolidBrush(Ink))
        using (SolidBrush muted = new SolidBrush(Gray))
        {
            graphics.FillRectangle(dim, GameBounds);
            using (StringFormat center = new StringFormat())
            {
                center.Alignment = StringAlignment.Center;
                center.LineAlignment = StringAlignment.Center;
                graphics.DrawString(title, logoFont, dark, new RectangleF(260, 462, 840, 52), center);
                graphics.DrawString(detail, smallFont, dark, new RectangleF(260, 516, 840, 30), center);
                graphics.DrawString(hint, tinyFont, muted, new RectangleF(260, 555, 840, 27), center);
            }
        }
    }

    private void DrawFooter(Graphics graphics)
    {
        DrawButton(graphics, MusicButton, musicOn ? "♫  MÚSICA: SÍ" : "×  MÚSICA: NO", musicOn ? "Silenciar música" : "Activar música", false);
        DrawButton(graphics, SoundButton, jumpSoundOn ? "♪  SALTO: SÍ" : "×  SALTO: NO", jumpSoundOn ? "Silenciar salto" : "Activar salto", false);
        DrawButton(graphics, RestartButton, "↻  REINICIAR", "Reiniciar partida", false);
        DrawButton(graphics, CloseButton, "SALIR  ×", "Cerrar juego", false);

        using (SolidBrush help = new SolidBrush(Gray))
        {
            graphics.DrawString("ESPACIO / ↑  SALTAR    ·    P  PAUSAR    ·    CLIC SOBRE EL JUEGO", tinyFont, help, 412, 824);
        }
    }

    private void DrawButton(Graphics graphics, RectangleF bounds, string text, string tooltip, bool dark)
    {
        using (SolidBrush fill = new SolidBrush(dark ? Ink : White))
        using (SolidBrush textBrush = new SolidBrush(dark ? White : Ink))
        using (Pen outline = new Pen(dark ? Ink : Border, 1))
        {
            DrawRoundRect(graphics, fill, bounds, 10);
            graphics.DrawRoundedRectangle(outline, Rectangle.Round(bounds), 10);
            using (StringFormat format = new StringFormat())
            {
                format.Alignment = StringAlignment.Center;
                format.LineAlignment = StringAlignment.Center;
                graphics.DrawString(text, tinyFont, textBrush, bounds, format);
            }
        }
    }

    private void DrawSheep(Graphics graphics)
    {
        float time = clock.ElapsedMilliseconds / 1000f;
        float stride = (float)Math.Sin(time * 17);
        bool airborne = sheepY < GroundY - SheepSize - LegLength - 1;
        float bodyY = sheepY + (airborne ? 0 : (float)Math.Abs(stride) * 2);

        using (SolidBrush shadow = new SolidBrush(Color.FromArgb(32, 0, 0, 0)))
        {
            float shadowWidth = airborne ? 57 : 77 + (float)Math.Abs(stride) * 8;
            graphics.FillEllipse(shadow, SheepX + 32 - shadowWidth / 2, GroundY - 5, shadowWidth, 10);
        }

        GraphicsState state = graphics.Save();
        graphics.TranslateTransform(SheepX + SheepSize / 2, bodyY + SheepSize / 2);
        graphics.RotateTransform(airborne ? -5 : stride * 2);
        RectangleF logo = new RectangleF(-SheepSize / 2, -SheepSize / 2, SheepSize, SheepSize);
        using (GraphicsPath mask = new GraphicsPath())
        using (Pen outline = new Pen(Ink, 1))
        {
            mask.AddEllipse(logo);
            GraphicsState imageState = graphics.Save();
            graphics.SetClip(mask);
            graphics.DrawImage(sheepImage, logo);
            graphics.Restore(imageState);
            graphics.DrawEllipse(outline, logo);
        }
        graphics.Restore(state);

        if (!airborne)
        {
            using (Pen speedLines = new Pen(Color.FromArgb(155, 155, 151), 2))
            {
                graphics.DrawLine(speedLines, SheepX - 30, bodyY + 26, SheepX - 8, bodyY + 26);
                graphics.DrawLine(speedLines, SheepX - 42, bodyY + 37, SheepX - 13, bodyY + 37);
            }
        }
    }

    private static void DrawObstacle(Graphics graphics, GameObstacle obstacle)
    {
        if (obstacle.Type == 0)
        {
            using (SolidBrush shade = new SolidBrush(Color.FromArgb(120, 120, 117)))
            using (SolidBrush face = new SolidBrush(Ink))
            using (SolidBrush shine = new SolidBrush(Color.White))
            {
                for (int index = 0; index < 3; index++)
                {
                    float x = obstacle.X + index * 25;
                    graphics.FillPolygon(shade, new PointF[]
                    {
                        new PointF(x, obstacle.Y + obstacle.Height),
                        new PointF(x + 16, obstacle.Y + 3),
                        new PointF(x + 33, obstacle.Y + obstacle.Height)
                    });
                    graphics.FillPolygon(face, new PointF[]
                    {
                        new PointF(x + 4, obstacle.Y + obstacle.Height - 3),
                        new PointF(x + 16, obstacle.Y + 11),
                        new PointF(x + 28, obstacle.Y + obstacle.Height - 3)
                    });
                    graphics.FillRectangle(shine, x + 14, obstacle.Y + obstacle.Height - 7, 4, 4);
                }
            }
        }
        else
        {
            using (SolidBrush frame = new SolidBrush(Ink))
            using (SolidBrush inside = new SolidBrush(Color.FromArgb(242, 242, 240)))
            using (SolidBrush glow = new SolidBrush(Color.FromArgb(110, 110, 107)))
            using (Pen edge = new Pen(Color.FromArgb(175, 175, 171), 2))
            {
                graphics.FillRectangle(frame, obstacle.X, obstacle.Y, obstacle.Width, obstacle.Height);
                graphics.FillRectangle(inside, obstacle.X + 8, obstacle.Y + 8, obstacle.Width - 16, obstacle.Height - 16);
                graphics.DrawRectangle(edge, obstacle.X + 8, obstacle.Y + 8, obstacle.Width - 16, obstacle.Height - 16);
                for (int row = 0; row < 4; row++)
                {
                    float y = obstacle.Y + 14 + row * 22;
                    graphics.FillRectangle(glow, obstacle.X + 13, y, obstacle.Width - 26, 13);
                    graphics.FillRectangle(frame, obstacle.X + 14, y + 3, 5, 5);
                    graphics.FillRectangle(frame, obstacle.X + obstacle.Width - 22, y + 3, 5, 5);
                }
                graphics.FillRectangle(frame, obstacle.X + obstacle.Width / 2 - 15, obstacle.Y - 6, 30, 8);
            }
        }
    }

    private static void DrawCoin(Graphics graphics, float x, float y, float diameter, bool animated, long tick)
    {
        float bob = animated ? (float)Math.Sin(tick * 0.007 + x * 0.02) * 4 : 0;
        RectangleF bounds = new RectangleF(x - diameter / 2, y + bob - diameter / 2, diameter, diameter);
        using (SolidBrush rim = new SolidBrush(Ink))
        using (SolidBrush face = new SolidBrush(Color.FromArgb(246, 246, 242)))
        using (Pen edge = new Pen(Ink, 2))
        using (Pen detail = new Pen(Color.FromArgb(100, 100, 96), 2))
        {
            graphics.FillEllipse(rim, bounds);
            bounds.Inflate(-4, -4);
            graphics.FillEllipse(face, bounds);
            graphics.DrawEllipse(edge, bounds);
            float centerX = bounds.X + bounds.Width / 2;
            float centerY = bounds.Y + bounds.Height / 2;
            graphics.DrawLine(detail, centerX, bounds.Y + 4, centerX, bounds.Bottom - 4);
            graphics.DrawEllipse(detail, centerX - 4, centerY - 4, 8, 8);
        }
    }

    private void AdvanceGame(object sender, EventArgs eventArgs)
    {
        if (!running || paused)
        {
            return;
        }

        long tick = clock.ElapsedMilliseconds;
        float delta = Math.Min((tick - previousTick) / 1000f, 0.035f);
        previousTick = tick;
        distance += speed * delta * 0.12f;
        speed = Math.Min(speed + delta * 3, 570);
        sheepVelocity += 1750 * delta;
        sheepY = Math.Min(sheepY + sheepVelocity * delta, GroundY - SheepSize - LegLength);
        if (sheepY >= GroundY - SheepSize - LegLength)
        {
            sheepY = GroundY - SheepSize - LegLength;
            sheepVelocity = 0;
        }

        foreach (GameObstacle obstacle in obstacles)
        {
            obstacle.X -= speed * delta;
        }
        obstacles.RemoveAll(delegate(GameObstacle obstacle) { return obstacle.X + obstacle.Width < 32; });
        if (obstacles.Count == 0 || obstacles[obstacles.Count - 1].X < nextObstacleX - 380)
        {
            bool spikes = random.Next(100) < 63;
            float width = spikes ? 78 : 74;
            float height = spikes ? 61 : 112;
            obstacles.Add(new GameObstacle(spikes ? 0 : 1, nextObstacleX, GroundY - height, width, height));
            nextObstacleX += 370 + (float)random.NextDouble() * 270;
        }

        foreach (GameCoin coin in coins)
        {
            coin.X -= speed * delta;
            if (CollectsCoin(coin))
            {
                coin.Collected = true;
                coinsCollected++;
            }
        }
        coins.RemoveAll(delegate(GameCoin coin) { return coin.Collected || coin.X < 30; });
        nextCoinX -= speed * delta;
        if (nextCoinX < ViewWidth + 180)
        {
            float height = random.Next(108, 157);
            coins.Add(new GameCoin(nextCoinX, GroundY - height));
            nextCoinX += 440 + (float)random.NextDouble() * 330;
        }

        int nextScore = (int)(distance / 10);
        if (nextScore > score)
        {
            score = nextScore;
            if (score > best)
            {
                best = score;
                recordDirty = true;
                if (tick - lastRecordSave > 10000)
                {
                    lastRecordSave = tick;
                    SaveRecord();
                }
            }
        }

        if (HasCollision())
        {
            running = false;
            timer.Stop();
        }

        Invalidate();
    }

    private bool CollectsCoin(GameCoin coin)
    {
        float playerX = SheepX + 39;
        float playerY = sheepY + SheepSize / 2;
        float coinY = coin.Y + (float)Math.Sin(clock.ElapsedMilliseconds * 0.007 + coin.X * 0.02) * 4;
        float dx = playerX - coin.X;
        float dy = playerY - coinY;
        return dx * dx + dy * dy < 49 * 49;
    }

    private bool HasCollision()
    {
        RectangleF sheepBounds = new RectangleF(SheepX + 15, sheepY + 14, SheepSize - 30, SheepSize - 24);
        foreach (GameObstacle obstacle in obstacles)
        {
            RectangleF hitbox = obstacle.Type == 0
                ? new RectangleF(obstacle.X + 7, obstacle.Y + 18, obstacle.Width - 14, obstacle.Height - 18)
                : new RectangleF(obstacle.X + 9, obstacle.Y + 9, obstacle.Width - 18, obstacle.Height - 9);
            if (sheepBounds.IntersectsWith(hitbox))
            {
                return true;
            }
        }
        return false;
    }

    private void LoadRecord()
    {
        string path = RecordPath;
        if (!File.Exists(path))
        {
            return;
        }

        try
        {
            int saved;
            if (Int32.TryParse(File.ReadAllText(path, Encoding.ASCII), out saved) && saved >= 0)
            {
                best = saved;
            }
        }
        catch (IOException error)
        {
            SetAudioStatus("No se pudo leer el récord: " + error.Message);
        }
        catch (UnauthorizedAccessException error)
        {
            SetAudioStatus("No se pudo leer el récord: " + error.Message);
        }
    }

    private string RecordPath
    {
        get
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Sheep Store",
                "Corre Ovejita",
                "record.txt");
        }
    }

    private void ShowRecordError(Exception error)
    {
        MessageBox.Show(
            "No se pudo guardar el récord.\r\n\r\n" + error.Message,
            "Sheep Store · Corre Ovejita",
            MessageBoxButtons.OK,
            MessageBoxIcon.Warning);
    }

    private static string FormatCounter(int value)
    {
        return Math.Max(0, value).ToString("D6");
    }

    private static void DrawRoundRect(Graphics graphics, Brush brush, RectangleF bounds, float radius)
    {
        if (radius <= 0)
        {
            graphics.FillRectangle(brush, bounds);
            return;
        }
        using (GraphicsPath path = RoundedRect(bounds, radius))
        {
            graphics.FillPath(brush, path);
        }
    }

    private static void DrawRoundRect(Graphics graphics, Color color, RectangleF bounds, float radius)
    {
        using (SolidBrush brush = new SolidBrush(color))
        {
            DrawRoundRect(graphics, brush, bounds, radius);
        }
    }

    private static GraphicsPath RoundedRect(RectangleF bounds, float radius)
    {
        GraphicsPath path = new GraphicsPath();
        float diameter = radius * 2;
        path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static readonly Color Ink = Color.FromArgb(24, 24, 24);
    private static readonly Color Gray = Color.FromArgb(116, 116, 111);
    private static readonly Color Border = Color.FromArgb(224, 224, 219);
    private static readonly Color White = Color.White;
    private static readonly RectangleF GameBounds = new RectangleF(34, GameTop, 1292, GameBottom - GameTop);
    private static readonly RectangleF PauseButton = new RectangleF(54, 190, 52, 52);
    private static readonly RectangleF MusicButton = new RectangleF(40, 794, 172, 38);
    private static readonly RectangleF SoundButton = new RectangleF(224, 794, 156, 38);
    private static readonly RectangleF RestartButton = new RectangleF(1038, 794, 154, 38);
    private static readonly RectangleF CloseButton = new RectangleF(1204, 794, 118, 38);

    private static void DrawRoundedRectangle(Graphics graphics, Pen pen, Rectangle bounds, float radius)
    {
        using (GraphicsPath path = RoundedRect(bounds, radius))
        {
            graphics.DrawPath(pen, path);
        }
    }
}

internal sealed class GameObstacle
{
    public int Type;
    public float X;
    public float Y;
    public float Width;
    public float Height;

    public GameObstacle(int type, float x, float y, float width, float height)
    {
        Type = type;
        X = x;
        Y = y;
        Width = width;
        Height = height;
    }
}

internal sealed class GameCoin
{
    public float X;
    public float Y;
    public bool Collected;

    public GameCoin(float x, float y)
    {
        X = x;
        Y = y;
    }
}

internal static class GraphicsExtensions
{
    public static void DrawRoundedRectangle(this Graphics graphics, Pen pen, Rectangle bounds, float radius)
    {
        using (GraphicsPath path = new GraphicsPath())
        {
            float diameter = radius * 2;
            path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            graphics.DrawPath(pen, path);
        }
    }
}
