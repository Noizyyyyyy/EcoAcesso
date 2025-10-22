// api/cadastrar.cjs - CÓDIGO TEMPORÁRIO DE TESTE

module.exports = async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    // RETORNA AS CHAVES E UMA MENSAGEM
    if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ 
            status: "ERRO CRÍTICO: Chaves de ambiente ausentes",
            url: supabaseUrl,
            anon_key_start: "Key não encontrada ou undefined"
        });
    }

    return res.status(200).json({ 
        status: "SUCESSO: Vercel está lendo as chaves",
        url: supabaseUrl,
        anon_key_start: supabaseAnonKey.substring(0, 10) + "..." // Mostra os 10 primeiros caracteres
    });
};
