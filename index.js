require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Guarda quem está trabalhando
const pontosAtivos = new Map();

bot.once('ready', async () => {
    console.log(`✅ Bot conectado como ${bot.user.tag}`);

    // =========================
    // PAINEL DE REGISTRO
    // =========================

    const canalRegistro = bot.channels.cache.find(
        canal => canal.name === 'registro'
    );

    if (canalRegistro) {
        const embedRegistro = new EmbedBuilder()
            .setTitle('📋 SISTEMA DE REGISTRO')
            .setDescription(
                'Clique no botão abaixo para realizar seu registro.'
            )
            .setFooter({
                text: 'Sistema de Registro'
            });

        const botaoRegistro = new ButtonBuilder()
            .setCustomId('abrir_registro')
            .setLabel('📝 Registrar')
            .setStyle(ButtonStyle.Success);

        const linhaRegistro = new ActionRowBuilder()
            .addComponents(botaoRegistro);

        await canalRegistro.send({
            embeds: [embedRegistro],
            components: [linhaRegistro]
        });

        console.log('✅ Painel de registro enviado.');
    }

    // =========================
    // PAINEL DE BATE-PONTO
    // =========================

    const canalPonto = bot.channels.cache.find(
        canal => canal.name === 'ponto'
    );

    if (canalPonto) {
        const embedPonto = new EmbedBuilder()
            .setTitle('⏰ BATE-PONTO')
            .setDescription(
                'Utilize os botões abaixo para registrar seu horário de trabalho.\n\n' +
                '🟢 **Entrar em serviço**\n' +
                'Registra o início do seu expediente.\n\n' +
                '🔴 **Sair de serviço**\n' +
                'Registra o fim do seu expediente e calcula o tempo trabalhado.'
            )
            .setFooter({
                text: 'Sistema de Bate-Ponto'
            });

        const botaoEntrar = new ButtonBuilder()
            .setCustomId('ponto_entrar')
            .setLabel('Entrar em serviço')
            .setEmoji('🟢')
            .setStyle(ButtonStyle.Success);

        const botaoSair = new ButtonBuilder()
            .setCustomId('ponto_sair')
            .setLabel('Sair de serviço')
            .setEmoji('🔴')
            .setStyle(ButtonStyle.Danger);

        const linhaPonto = new ActionRowBuilder()
            .addComponents(
                botaoEntrar,
                botaoSair
            );

        await canalPonto.send({
            embeds: [embedPonto],
            components: [linhaPonto]
        });

        console.log('✅ Painel de bate-ponto enviado.');
    } else {
        console.log('❌ Canal "ponto" não encontrado.');
    }
});

bot.on('interactionCreate', async (interaction) => {

    // =========================
    // ABRIR REGISTRO
    // =========================

    if (
        interaction.isButton() &&
        interaction.customId === 'abrir_registro'
    ) {
        const modal = new ModalBuilder()
            .setCustomId('formulario_registro')
            .setTitle('📋 Registro');

        const nome = new TextInputBuilder()
            .setCustomId('nome')
            .setLabel('Seu nome')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const id = new TextInputBuilder()
            .setCustomId('id')
            .setLabel('Seu ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const cargo = new TextInputBuilder()
            .setCustomId('cargo')
            .setLabel('Seu cargo')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nome),
            new ActionRowBuilder().addComponents(id),
            new ActionRowBuilder().addComponents(cargo)
        );

        await interaction.showModal(modal);
    }

    // =========================
    // ENVIO DO REGISTRO
    // =========================

    if (
        interaction.isModalSubmit() &&
        interaction.customId === 'formulario_registro'
    ) {
        const nome = interaction.fields.getTextInputValue('nome');
        const id = interaction.fields.getTextInputValue('id');
        const cargo = interaction.fields.getTextInputValue('cargo');

        const embed = new EmbedBuilder()
            .setTitle('📋 NOVO REGISTRO')
            .addFields(
                {
                    name: '👤 Nome',
                    value: nome
                },
                {
                    name: '🆔 ID',
                    value: id
                },
                {
                    name: '🎖️ Cargo',
                    value: cargo
                },
                {
                    name: '👮 Registrado por',
                    value: `${interaction.user}`
                }
            )
            .setTimestamp();

        const canalLogs = interaction.guild.channels.cache.find(
            canal => canal.name === 'registro-logs'
        );

        if (canalLogs) {
            const aprovar = new ButtonBuilder()
                .setCustomId(`aprovar_registro_${interaction.user.id}`)
                .setLabel('Aprovar')
                .setStyle(ButtonStyle.Success);

            const negar = new ButtonBuilder()
                .setCustomId(`negar_registro_${interaction.user.id}`)
                .setLabel('Negar')
                .setStyle(ButtonStyle.Danger);

            const linha = new ActionRowBuilder()
                .addComponents(aprovar, negar);

            await canalLogs.send({
                embeds: [embed],
                components: [linha]
            });
        }

        await interaction.reply({
            content: '✅ Seu registro foi enviado para análise!',
            ephemeral: true
        });
    }

    // =========================
    // APROVAR REGISTRO
    // =========================

    if (
        interaction.isButton() &&
        interaction.customId.startsWith('aprovar_registro_')
    ) {
        const userId = interaction.customId.replace(
            'aprovar_registro_',
            ''
        );

        const membro = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

        if (!membro) {
            return interaction.reply({
                content: '❌ Usuário não encontrado.',
                ephemeral: true
            });
        }

        const cargoMembro = interaction.guild.roles.cache.find(
            role => role.name === 'Membro'
        );

        if (!cargoMembro) {
            return interaction.reply({
                content: '❌ Cargo "Membro" não encontrado.',
                ephemeral: true
            });
        }

        await membro.roles.add(cargoMembro);

        await interaction.reply({
            content: `✅ Registro aprovado! ${membro} recebeu o cargo **Membro**.`,
            ephemeral: true
        });
    }

    // =========================
    // NEGAR REGISTRO
    // =========================

    if (
        interaction.isButton() &&
        interaction.customId.startsWith('negar_registro_')
    ) {
        const userId = interaction.customId.replace(
            'negar_registro_',
            ''
        );

        const modal = new ModalBuilder()
            .setCustomId(`motivo_negacao_${userId}`)
            .setTitle('❌ Negar Registro');

        const motivo = new TextInputBuilder()
            .setCustomId('motivo')
            .setLabel('Motivo da negação')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(motivo)
        );

        await interaction.showModal(modal);
    }

    // =========================
    // MOTIVO DA NEGAÇÃO
    // =========================

    if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith('motivo_negacao_')
    ) {
        const userId = interaction.customId.replace(
            'motivo_negacao_',
            ''
        );

        const motivo = interaction.fields.getTextInputValue('motivo');

        const membro = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

        if (membro) {
            try {
                await membro.send(
                    `❌ Seu registro foi negado.\n\n**Motivo:** ${motivo}`
                );
            } catch {}
        }

        await interaction.reply({
            content: `❌ Registro negado.\n**Motivo:** ${motivo}`,
            ephemeral: true
        });
    }

    // =========================
    // ENTRAR EM SERVIÇO
    // =========================

    if (
        interaction.isButton() &&
        interaction.customId === 'ponto_entrar'
    ) {
        if (pontosAtivos.has(interaction.user.id)) {
            return interaction.reply({
                content: '⚠️ Você já está em serviço!',
                ephemeral: true
            });
        }

        const entrada = new Date();

        pontosAtivos.set(interaction.user.id, entrada);

        const canalLogs = interaction.guild.channels.cache.find(
            canal => canal.name === 'ponto-logs'
        );

        if (canalLogs) {
            const embed = new EmbedBuilder()
                .setTitle('🟢 ENTRADA EM SERVIÇO')
                .addFields(
                    {
                        name: '👤 Usuário',
                        value: `${interaction.user}`
                    },
                    {
                        name: '🟢 Horário de entrada',
                        value: `<t:${Math.floor(entrada.getTime() / 1000)}:F>`
                    }
                )
                .setTimestamp();

            await canalLogs.send({
                embeds: [embed]
            });
        }

        await interaction.reply({
            content: '🟢 Você entrou em serviço com sucesso!',
            ephemeral: true
        });
    }

    // =========================
    // SAIR DE SERVIÇO
    // =========================

    if (
        interaction.isButton() &&
        interaction.customId === 'ponto_sair'
    ) {
        const entrada = pontosAtivos.get(interaction.user.id);

        if (!entrada) {
            return interaction.reply({
                content: '⚠️ Você não está em serviço!',
                ephemeral: true
            });
        }

        const saida = new Date();

        const tempoMs = saida.getTime() - entrada.getTime();

        const horas = Math.floor(tempoMs / 3600000);
        const minutos = Math.floor(
            (tempoMs % 3600000) / 60000
        );
        const segundos = Math.floor(
            (tempoMs % 60000) / 1000
        );

        const tempoTotal =
            `${horas}h ${minutos}min ${segundos}s`;

        pontosAtivos.delete(interaction.user.id);

        const canalLogs = interaction.guild.channels.cache.find(
            canal => canal.name === 'ponto-logs'
        );

        if (canalLogs) {
            const embed = new EmbedBuilder()
                .setTitle('🔴 SAÍDA DE SERVIÇO')
                .addFields(
                    {
                        name: '👤 Usuário',
                        value: `${interaction.user}`
                    },
                    {
                        name: '🟢 Horário de entrada',
                        value: `<t:${Math.floor(entrada.getTime() / 1000)}:F>`
                    },
                    {
                        name: '🔴 Horário de saída',
                        value: `<t:${Math.floor(saida.getTime() / 1000)}:F>`
                    },
                    {
                        name: '⏱️ Tempo total trabalhado',
                        value: tempoTotal
                    }
                )
                .setTimestamp();

            await canalLogs.send({
                embeds: [embed]
            });
        }

        await interaction.reply({
            content:
                `🔴 Você saiu de serviço!\n\n` +
                `⏱️ **Tempo trabalhado:** ${tempoTotal}`,
            ephemeral: true
        });
    }
});

bot.login(process.env.TOKEN);