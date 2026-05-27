# QuantGuide Question

## 1023. Likely Targets II

**Metadata**

- ID: `gDlCpfYuahaWKFwqoVBF`
- URL: https://www.quantguide.io/questions/likely-target-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: DE Shaw
- Source: desco edited
- Tags: Continuous Random Variables, Games
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 13:18:27 America/New_York
- Last Edited By: Gabe

### 题干

Two linear targets, say $A$ and $B$, of respective radii $\varepsilon$ and $2\varepsilon$, where $\varepsilon << 1$, are placed on an infinitely long line. The targets are centered at $x_A = -1$ and $x_B = 3$. In other words, target $A$ covers the interval $[1-\varepsilon, 1+\varepsilon]$, while target $B$ covers the interval $[3-2\varepsilon, 3+2\varepsilon]$. You have one dart to shoot at the line. Your goal is to maximize your probability of hitting one of the targets. You can choose where to center your throw on the line. If you select to center your dart at $\mu$, the actual position your dart lands at is $X \sim N(\mu,4)$. Find the value of $\mu$ that maximizes your chances of hitting a target. If necessary, round your answer to the nearest hundredth.

### Hint

The key here is to note that since the targets are of extremely small radius, we can essentially treat them as points. How do you account for the difference in radii?

### 解答

The key here is to note that since the targets are of extremely small radius, we can essentially treat them as points. The approximate probability we hit target $A$ would be approximately $f(x_A)\varepsilon$, where $f(x_A)$ is the probability density at point $A$. However, since $B$ is also of small radius $2\varepsilon$, the probability we hit target $B$ is approximately $2f(x_B)\varepsilon$. Since the two targets are disjoint, our goal is to maximize the weighted sum of the probability densities. Our probability density here is dependent on what $\mu$ we select. Therefore, as a function of $\mu$, we need to maximize $$f(\mu) = \dfrac{1}{2\sqrt{2\pi}}\left(e^{-\frac{(-1-\mu)^2}{8}} + 2e^{-\frac{(3-\mu)^2}{8}}\right)$$ The two interior terms are just the density of a $N(\mu,4)$ distribution at $-1$ and $3$. To do this, we take the derivative and set it equal to $0$. In particular, $$f'(\mu) = \dfrac{1}{2\sqrt{2\pi}}\left[\dfrac{-1-\mu}{4}e^{-\frac{(-1-\mu)^2}{8}} + \dfrac{3-\mu}{2}e^{-\frac{(3-\mu)^2}{8}}\right] = 0$$ Using a computer system, $f'(\mu) = 0$ for $\mu \approx 2.649$. One can verify that this is indeed a maxima, so $2.65$ is our answer. This intuitively makes sense, as the increased size of the region around $3$ means that we should assign more density there. Thus, our answer should be closer to $3$ than it is to $-1$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2.65"
    ],
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "gDlCpfYuahaWKFwqoVBF",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 13:18:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8319980,
    "source": "desco edited",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Likely Targets II",
    "topic": "probability",
    "urlEnding": "likely-target-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "hard",
    "id": "gDlCpfYuahaWKFwqoVBF",
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
    "title": "Likely Targets II",
    "topic": "probability",
    "urlEnding": "likely-target-ii"
  }
}
```
