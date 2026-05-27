# QuantGuide Question

## 1120. Brownian Supremum

**Metadata**

- ID: `A7oQw1tqsPglJCmqpNuF`
- URL: https://www.quantguide.io/questions/brownian-supremum
- Topic: pure math
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: MSE
- Tags: Stochastic Calculus
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-30 23:18:25 America/New_York
- Last Edited By: Gabe

### 题干

Let $W_t$ be a standard Brownian Motion. Define $M_t = \underset{s \in [0,t]}{\sup} W_s$. For any $t > 0$, find $\mathbb{P}[M_t > 0]$.

### Hint

Define the events $A_n = \left\{W_{\frac{1}{n}} > \frac{1}{\sqrt{n}}\right\}$ and $B = \limsup A_n = \{A_n \hspace{3pt} \text{i.o.}\}$. Use Fatou's Lemma.

### 解答

Define the events $A_n = \left\{W_{\frac{1}{n}} > \frac{1}{\sqrt{n}}\right\}$ and $B = \limsup A_n = \{A_n \hspace{3pt} \text{i.o.}\}$. Then we have that

$$$$

$$\begin{aligned} & \mathbb{P}[B]=\mathbb{P}\left[\limsup  A_n\right] \\ & \geq \limsup \mathbb{P}\left[A_n\right] \hspace{3pt} \text{(Fatou's Lemma)}\\ & =\limsup \mathbb{P}\left[W_{1 / n}>\frac{1}{\sqrt{n}}\right] \\ & =\limsup _n \mathbb{P}[Z>1] \hspace{3pt} \text{($\cdot \sqrt{n}$ to get $Z \sim N(0,1)$)}\\ & =\mathbb{P}[Z>1]=1-\Phi(1)>0 \\ & \end{aligned}$$ By Blumenthal's $0-1$ Law, we know that $\mathbb{P}[B] = 0$ or $1$. Since we already know $\mathbb{P}[B] > 0$, we know that $\mathbb{P}[B] = 1$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "A7oQw1tqsPglJCmqpNuF",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:18:25 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9202890,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Brownian Supremum",
    "topic": "pure math",
    "urlEnding": "brownian-supremum",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "A7oQw1tqsPglJCmqpNuF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Stochastic Calculus"
      }
    ],
    "title": "Brownian Supremum",
    "topic": "pure math",
    "urlEnding": "brownian-supremum"
  }
}
```
