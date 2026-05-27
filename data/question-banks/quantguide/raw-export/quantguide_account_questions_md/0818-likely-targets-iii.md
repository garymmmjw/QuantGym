# QuantGuide Question

## 818. Likely Targets III

**Metadata**

- ID: `tGHjvNCXZkFww9tBWUpH`
- URL: https://www.quantguide.io/questions/likely-targets-iii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: DE Shaw
- Source: og
- Tags: Continuous Random Variables, Games
- Premium: True
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 13:25:11 America/New_York
- Last Edited By: Gabe

### 题干

Three linear targets, say $A,B,$ and $C$, of respective radii $\varepsilon, 2\varepsilon,$ and $3\varepsilon$, where $\varepsilon << 1$, are placed on an infinitely long line. The targets are centered at $x_A = -1, x_B = 3,$ and $x_C = 5$. In other words, target $A$ covers the interval $[1-\varepsilon, 1+\varepsilon]$, target $B$ covers the interval $[3-2\varepsilon, 3+2\varepsilon]$, and target $C$ covers the interval $[5-3\varepsilon, 5+3\varepsilon]$. You have one dart to shoot at the line. Your goal is to maximize your probability of hitting one of the targets. You can choose where to center your throw on the line. If you select to center your dart at $\mu$, the actual position your dart lands at is $X \sim N(\mu,4)$. Find the value of $\mu$ that maximizes your chances of hitting a target. If necessary, round your answer to the nearest hundredth.

### Hint

The key here is to note that since the targets are of extremely small radius, we can essentially treat them as points. How do we account for difference in radii? How do we account for the $3$ targets instead of $2$?

### 解答

The key here is to note that since the targets are of extremely small radius, we can essentially treat them as points. The approximate probability we hit target $A$ would be approximately $f(x_A)\varepsilon$, where $f(x_A)$ is the probability density at point $A$. However, since $B$ is also of small radius $2\varepsilon$, the probability we hit target $B$ is approximately $2f(x_B)\varepsilon$. Likewise, the probability we hit target $C$ is approximately $3f(x_C)\varepsilon$. Since the targets are disjoint, our goal is to maximize the weighted sum of the probability densities. Our probability density here is dependent on what $\mu$ we select. Therefore, as a function of $\mu$, we need to maximize $$f(\mu) = \dfrac{1}{2\sqrt{2\pi}}\left(e^{-\frac{(-1-\mu)^2}{8}} + 2e^{-\frac{(3-\mu)^2}{8}} + 3e^{-\frac{(5-\mu)^2}{8}}\right)$$ The interior terms are just the density of a $N(\mu,4)$ distribution at $-1, 3,$ and $5$, respectively. To do this, we take the derivative and set it equal to $0$. In particular, $$f'(\mu) = \dfrac{1}{2\sqrt{2\pi}}\left[\dfrac{-1-\mu}{4}e^{-\frac{(-1-\mu)^2}{8}} + \dfrac{3-\mu}{2}e^{-\frac{(3-\mu)^2}{8}} + 3 \cdot \dfrac{5-\mu}{4}e^{-\frac{(5-\mu)^2}{8}}\right] = 0$$ Using a computer system, $f'(\mu) = 0$ for $\mu \approx 4.211$. One can verify that this is indeed a maxima, so $4.21$ is our answer. This intuitively makes sense, as the increased size of the region around $3$ and $5$ means that we should assign more density there. Furthermore, the region around $5$ is slightly larger than the region around $3$, so the center should be placed closer to $5$ than $3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4.21"
    ],
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "tGHjvNCXZkFww9tBWUpH",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 13:25:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6700907,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Likely Targets III",
    "topic": "probability",
    "urlEnding": "likely-targets-iii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "id": "tGHjvNCXZkFww9tBWUpH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Likely Targets III",
    "topic": "probability",
    "urlEnding": "likely-targets-iii"
  }
}
```
