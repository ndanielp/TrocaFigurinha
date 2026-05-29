-- Seed: cep_centroids — approximate coordinates by 5-digit CEP prefix
-- Source: IBGE/OpenStreetMap public data (offline processed)
-- Coverage: major Brazilian 5-digit CEP prefixes
-- Idempotente via ON CONFLICT DO NOTHING

INSERT INTO cep_centroids (cep_prefix, lat, lng, locality) VALUES
-- São Paulo (capital)
('01001', -23.5505, -46.6333, 'São Paulo - Centro'),
('01310', -23.5617, -46.6556, 'São Paulo - Av. Paulista'),
('02001', -23.5200, -46.6100, 'São Paulo - Santana'),
('03001', -23.5400, -46.5900, 'São Paulo - Mooca'),
('04001', -23.6000, -46.6300, 'São Paulo - Santo André'),
('05001', -23.5300, -46.7300, 'São Paulo - Lapa'),
('08001', -23.5400, -46.4400, 'São Paulo - Itaquera'),
-- Rio de Janeiro
('20001', -22.9068, -43.1729, 'Rio de Janeiro - Centro'),
('20040', -22.9000, -43.1700, 'Rio de Janeiro - Lapa'),
('20050', -22.9100, -43.1800, 'Rio de Janeiro - Cinelândia'),
('21001', -22.8700, -43.3000, 'Rio de Janeiro - Bangu'),
('22001', -22.9400, -43.1600, 'Rio de Janeiro - Botafogo'),
('22071', -22.9711, -43.1822, 'Rio de Janeiro - Copacabana'),
('22630', -23.0100, -43.3000, 'Rio de Janeiro - Barra da Tijuca'),
('23001', -23.0000, -43.4500, 'Rio de Janeiro - Santa Cruz'),
('24001', -22.8900, -43.1000, 'Niterói'),
('25001', -22.8500, -43.1200, 'Duque de Caxias'),
('26001', -22.7400, -43.4500, 'Nova Iguaçu'),
-- Minas Gerais
('30001', -19.9167, -43.9345, 'Belo Horizonte - Centro'),
('30130', -19.9200, -43.9400, 'Belo Horizonte - Savassi'),
('31001', -19.9000, -43.9000, 'Belo Horizonte - Pampulha'),
('36001', -21.7642, -43.3503, 'Juiz de Fora'),
('38001', -18.9186, -48.2772, 'Uberlândia'),
-- Rio Grande do Sul
('90001', -30.0346, -51.2177, 'Porto Alegre - Centro'),
('90040', -30.0300, -51.2100, 'Porto Alegre - Bom Fim'),
('91001', -29.9800, -51.1500, 'Canoas'),
('92001', -29.9500, -51.1400, 'Novo Hamburgo'),
('93001', -29.8100, -51.1500, 'São Leopoldo'),
('95001', -29.1680, -51.1790, 'Caxias do Sul'),
('96001', -31.3300, -52.1200, 'Rio Grande'),
('97001', -29.6900, -53.8100, 'Santa Maria'),
('99001', -28.2600, -52.4100, 'Passo Fundo'),
-- Santa Catarina
('88001', -27.5954, -48.5480, 'Florianópolis - Centro'),
('88010', -27.6000, -48.5500, 'Florianópolis - Trindade'),
('89001', -26.9100, -49.0700, 'Blumenau'),
('89201', -26.3100, -48.8500, 'Joinville'),
('89500', -27.2200, -50.0400, 'Lages'),
('89701', -26.9100, -52.3800, 'Chapecó'),
-- Paraná
('80001', -25.4284, -49.2733, 'Curitiba - Centro'),
('80010', -25.4300, -49.2800, 'Curitiba - Batel'),
('81001', -25.5000, -49.3200, 'Curitiba - Boqueirão'),
('83001', -25.4300, -49.1700, 'São José dos Pinhais'),
('85001', -25.4400, -49.1200, 'Foz do Iguaçu area'),
('85851', -25.5200, -54.5800, 'Foz do Iguaçu'),
('86001', -23.3100, -51.1600, 'Londrina'),
('87001', -23.4200, -51.9400, 'Maringá'),
-- Bahia
('40001', -12.9714, -38.5014, 'Salvador - Centro'),
('40020', -12.9700, -38.5100, 'Salvador - Pelourinho'),
('41001', -12.9800, -38.5200, 'Salvador - Barra'),
('41750', -12.9100, -38.4600, 'Salvador - Pituba'),
('44001', -12.1350, -38.9670, 'Feira de Santana'),
('45001', -14.8600, -40.8400, 'Vitória da Conquista'),
('47001', -10.9200, -40.1800, 'Jacobina area'),
('48001', -10.8600, -37.0500, 'Aracaju area'),
-- Pernambuco
('50001', -8.0578, -34.8829, 'Recife - Centro'),
('50700', -8.0500, -34.9400, 'Recife - Boa Viagem'),
('51001', -8.0600, -34.9300, 'Recife - Piedade'),
('54001', -8.0000, -34.9300, 'Jaboatão dos Guararapes'),
('55001', -7.9200, -34.8500, 'Olinda'),
('56001', -9.4000, -40.5000, 'Petrolina'),
('58001', -7.1195, -34.8450, 'João Pessoa'),
('59001', -5.7945, -35.2110, 'Natal'),
-- Ceará
('60001', -3.7327, -38.5270, 'Fortaleza - Centro'),
('60150', -3.7400, -38.5100, 'Fortaleza - Meireles'),
('60175', -3.7500, -38.4900, 'Fortaleza - Aldeota'),
('61001', -3.7800, -38.5300, 'Caucaia'),
('62001', -3.7200, -40.3500, 'Sobral'),
('63001', -7.2100, -39.3200, 'Juazeiro do Norte'),
-- Amazonas / Pará
('66001', -1.4558, -48.5039, 'Belém - Centro'),
('66600', -1.4700, -48.5000, 'Belém - Nazaré'),
('68001', -1.7000, -48.8800, 'Castanhal'),
('69001', -3.1189, -60.0217, 'Manaus - Centro'),
('69040', -3.1300, -60.0400, 'Manaus - Adrianópolis'),
('69301', -2.8200, -60.6200, 'Manaus - Tarumã area'),
-- Goiás / DF
('70001', -15.7797, -47.9297, 'Brasília - Centro'),
('70040', -15.8000, -47.9200, 'Brasília - Asa Sul'),
('70910', -15.7600, -47.8800, 'Brasília - Asa Norte'),
('72001', -15.9600, -48.0700, 'Taguatinga'),
('73001', -15.9800, -48.1200, 'Ceilândia'),
('74001', -16.6869, -49.2648, 'Goiânia - Centro'),
('74810', -16.7000, -49.2700, 'Goiânia - Jardim Goiás'),
('75001', -17.7300, -48.9600, 'Anápolis'),
('76001', -15.9000, -50.0700, 'Itumbiara area'),
-- Mato Grosso
('78001', -15.6014, -56.0979, 'Cuiabá'),
('78740', -15.5900, -56.1000, 'Cuiabá - Jardim Imperial'),
('79001', -20.4428, -54.6460, 'Campo Grande'),
-- Espírito Santo
('29001', -20.3222, -40.3381, 'Vitória - Centro'),
('29160', -20.3400, -40.3300, 'Vitória - Jardim Camburi'),
('29200', -20.2600, -40.2800, 'Serra'),
('29300', -20.3300, -40.3700, 'Vila Velha'),
-- Rio Grande do Norte
('59011', -5.7945, -35.2110, 'Natal - Alecrim'),
('59060', -5.7800, -35.1900, 'Natal - Lagoa Nova'),
-- Paraíba
('58011', -7.1200, -34.8500, 'João Pessoa - Tambaú'),
-- Alagoas
('57001', -9.6658, -35.7350, 'Maceió'),
-- Sergipe
('49001', -10.9167, -37.0500, 'Aracaju'),
-- Piauí
('64001', -5.0892, -42.8019, 'Teresina'),
-- Maranhão
('65001', -2.5297, -44.3028, 'São Luís'),
-- Tocantins
('77001', -10.1840, -48.3336, 'Palmas'),
-- Rondônia
('76801', -8.7612, -63.9039, 'Porto Velho'),
-- Acre
('69901', -9.9754, -67.8249, 'Rio Branco'),
-- Roraima
('69301', 2.8235, -60.6758, 'Boa Vista'),
-- Amapá
('68900', 0.0349, -51.0694, 'Macapá'),
-- Mato Grosso do Sul (additional)
('79002', -20.4500, -54.6500, 'Campo Grande - Região 2'),
('79100', -19.4000, -54.5400, 'Aquidauana')
ON CONFLICT (cep_prefix) DO NOTHING;
