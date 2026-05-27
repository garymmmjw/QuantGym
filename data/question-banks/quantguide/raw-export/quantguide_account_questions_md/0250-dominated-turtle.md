# QuantGuide Question

## 250. Dominated Turtle

**Metadata**

- ID: `btchs05xUKZ5mRxcNutT`
- URL: https://www.quantguide.io/questions/dominated-turtle
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: jhu prob theory
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Two turtles, Tort and Bort, are going to perform independent simple symmetric random walks on the integers starting at positions $0$ and $4$, respectively. Compute the probability after $10$ steps, Tort and Bort are back at their initial positions and that Tort was strictly behind Bort at all $10$ steps. The answer will be in the form $$\dfrac{\displaystyle \binom{a}{b}^p - \binom{c}{d}^p}{2^r}$$ where $b \leq \dfrac{a}{2}$ and $d \leq \dfrac{c}{2}$. Find $a^2 + b^2 + c^2 + d^2 + p^2 + r^2$.

### Hint

If $X_n$ is the position of Tort and $Y_n$ is the position of Bort (both at time $n$), imagine plotting $(X_n,Y_n)$ in the plane. Think about complementation and some type of reflection principle.

### 解答

If $X_n$ is the position of Tort and $Y_n$ is the position of Bort (both at time $n$), imagine plotting $(X_n,Y_n)$ in the plane. Essentially, we would want the number of paths staying strictly below the $X_n = Y_n$ line. Let $N^*_{10,(a,b) \rightarrow (c,d)}$ be the number of paths where Tort is below Bort the entire time starting at $(a,b)$ and ending at $(c,d)$ after $10$ steps. Let $N_{10,(a,b) \rightarrow (c,d)}$ be the number of paths from $(a,b)$ to $(c,d)$ in $10$ steps. Lastly, let $N^c_{10,(a,b) \rightarrow (c,d)}$ be the number of paths where Tort does catch up to Bort at some point in the $10$ steps that start at $(a,b)$ and end at $(c,d)$. The question here is asking for $\dfrac{N^*_{10,(0,4) \rightarrow (0,4)}}{2^{20}}$, as each path is equally likely and there are $2^{20}$ total paths that can be taken ($2^{10}$ for each of the turtles).

$$$$

A quick observation is that $N^*_{10,(0,4) \rightarrow (0,4)} = N_{10,(0,4) \rightarrow (0,4)} - N^c_{10,(0,4) \rightarrow (0,4)}$. This is really just the complementary rule. Computing $N_{10,(0,4) \rightarrow (0,4)}$ is not particularly difficult, and we will do so closer to the end. However, there is no clear way to compute $N^c_{10,(0,4) \rightarrow (0,4)}$ right now, so we should focus on that first.

$$$$

If some path is part of $N_{10,(0,4) \rightarrow (0,4)}$, that means that Tort must have caught up to Bort at some point. In other words, the $X_n = Y_n$ line was crossed at some point. Therefore, the idea is to reflect the path up until that meeting point across the $X_n = Y_n$ line and then keep the rest of the path untouched. In particular, the point $(0,4)$ gets reflected to $(4,0)$. Therefore, there is a one-to-one correspondence between paths that cross the $X_n = Y_n$ line that are counted for $N^c_{10,(0,4) \rightarrow (0,4)}$ and unconstrained paths (since once we do the reflection, there are no issues with crossing) from $(4,0)$ to $(0,4)$. This implies that $$N^c_{10,(0,4) \rightarrow (0,4)} = N_{10,(4,0) \rightarrow (0,4)}$$ Substituting this into our first expression, we get that $$N^*_{10,(0,4) \rightarrow (0,4)} = N_{10,(0,4) \rightarrow (0,4)} - N_{10,(4,0) \rightarrow (0,4)}$$ All that is left is to calculate $N_{10,(a,b) \rightarrow (c,d)}$. For this, we just need to multiply together the number of paths from $a$ to $c$ in $10$ steps (this corresponds to Tort) and number of paths from $b$ to $d$ in $10$ steps (this corresponds to Bort).

$$$$

To get from $a$ to $c$ in $10$ steps, if we move right $x$ times, we must move left $10-x$ times. Therefore, our position would be $a + x -(10-x)$. We need this to equal $c$, so we must solve for $x$ in $a+x-(10-x) =c$, which yields $x = \dfrac{10+c-a}{2}$. This implies that $N_{10,(a,b) \rightarrow (c,d)} = \displaystyle \binom{10}{x_1}\binom{10}{x_2}$, where $x_1 = \dfrac{10+c-a}{2}$ and $x_2 = \dfrac{10+d-b}{2}$.

$$$$

Therefore, $N_{10,(0,4) \rightarrow (0,4)} = \displaystyle \binom{10}{5}^2$ and $N_{10, (4,0) \rightarrow (0,4)} = \displaystyle \binom{10}{3}^2$. This implies our final probability is $$\dfrac{\displaystyle \binom{10}{5}^2 - \binom{10}{3}^2}{2^{20}}$$ Extracting the values, $a = c = 10$, $b = 5$, $d = 3$,  $p = 2$, and $r = 20$. This means $a^2 + b^2 + c^2 + d^2 + p^2 + r^2 = 638$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "638"
    ],
    "difficulty": "hard",
    "id": "btchs05xUKZ5mRxcNutT",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1975782,
    "source": "jhu prob theory",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dominated Turtle",
    "topic": "probability",
    "urlEnding": "dominated-turtle"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "btchs05xUKZ5mRxcNutT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Dominated Turtle",
    "topic": "probability",
    "urlEnding": "dominated-turtle"
  }
}
```
